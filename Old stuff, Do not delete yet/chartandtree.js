var data = undefined;

// get data from server
var dataRequest = new XMLHttpRequest();
dataRequest.open('GET', '/get/userdata', true);
dataRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
dataRequest.setRequestHeader('x-access-token', localStorage.getItem("loginToken"));
dataRequest.responseType = "json";
dataRequest.onreadystatechange = function() {
    if(dataRequest.readyState == 4 && dataRequest.status == 200) {
        data = dataRequest.response;
        checkFirstLogin();
    }
}
dataRequest.send();

var app = new PIXI.Application({
        view: pixiCanvas,
        width: window.innerWidth,
        height: window.innerHeight - 70,
        backgroundColor: 0x183693,
        antialias: true,
        autoStart: false,
        autoResize: true
});

// TOP BAR

// get username from token and show it
var tokenPayload = parseJwt(localStorage.getItem("loginToken"));
document.getElementById("welcome").innerText = "Hello " + tokenPayload.username + "!";

function checkFirstLogin() {
    if (data.mainTree != undefined) startLoader();
    else {
        var modal = document.getElementById('firstLogin');
        var btn = document.getElementById('savebtn');
        var mainTree = document.getElementById('maintree');

        btn.onclick = function() {
            var location = document.getElementById('location').value;
            var teachingDay = document.getElementById('day').value;
            var teachingTime = document.getElementById('timeStart').value + ' - ' + document.getElementById('timeEnd').value;


            var firstLoginData = {
                    mainTree: mainTree.value,
                    teachingDay: teachingDay,
                    teachingTime: teachingTime,
                    location: location
            };

            request('POST', '/set/firstlogindata', firstLoginData, function() {
                if(this.readyState == 4 && this.status == 200) {
                  window.open("/user/", "_self");
                }
            });
        }

        /*var span = document.getElementsByClassName("modalClose")[0];

        span.onclick = function() {
            modal.style.display = "none";
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }*/

        for (var i = 0; i < data.focusArea.treeNames.length; ++i) {
            var option = document.createElement('option');
            option.value = option.text = data.focusArea.treeNames[i];
            mainTree.add(option);
        }

        if (!data.willingToTeach) document.getElementById('teachingSettings').style.display = 'none';

        modal.style.display = "block";
    }
}

/*function toggleSkillDetailsPage() {
    var modal = document.getElementById('skillpage');

    modal.style.display = "block";

}*/

// ???

function loadAddedTrees(){
  var treeList = document.getElementById('treeList');
  treeList.innerHTML = "";
  for (var i = 0; i < data.trees.length; i++) {
    var tn = data.trees[i].name;
    var ithtree = document.createElement('a');
    ithtree.innerHTML = tn;
    ithtree.className = "dropdown-item";
    ithtree.onclick = function() {
      showTree(this.innerHTML);
    }
    treeList.appendChild(ithtree);
  }
}

function searchUsersByName(){
  var userToSearch = {value: document.getElementById('searchedUser').value};
  var sideBarUserSearchResult = document.getElementById('sideBarUserSearchResult');

  request('POST', '/set/searchUsersByName', userToSearch, function() {
      if(this.readyState == 4 && this.status == 200) {
        sideBarUserSearchResult.innerHTML = "";
        for (var i = 0; i < this.response.length; i++) {
          var mya = document.createElement('option');
          mya.value = this.response[i].name;
          sideBarUserSearchResult.appendChild(mya);
        }
      }
  });
}

function getPublicUserData(){
  var userToSearch = {value: document.getElementById('searchedUser').value};

  request('POST', '/set/getPublicUserData', userToSearch, function() {
      if(this.readyState == 4 && this.status == 200) {
        alert("User found, data loaded.");
      }
  });
}

function searchTreesByName(){
  var treeToSearch = {value: document.getElementById('searchedTree').value};
  var sideBarTreeSearchResult = document.getElementById('sideBarTreeSearchResult');

  request('POST', '/set/searchTreesByName', treeToSearch, function() {
      if(this.readyState == 4 && this.status == 200) {
        sideBarTreeSearchResult.innerHTML = "";
        for (var i = 0; i < this.response.length; i++) {
          var mya = document.createElement('option');
          mya.value = this.response[i].name;
          sideBarTreeSearchResult.appendChild(mya);
        }
      }
  });
}

function addTreeToUser(){
  var treeToAdd = {value: document.getElementById('searchedTree').value};

  request('POST', '/set/addTreeToUser', treeToAdd, function() {
      if (this.readyState == 4 && this.status == 200) {
        if (this.response.success){
          var forest = document.getElementById("forest");
          var nt = document.createElement('div');
          nt.innerText = this.response.name;
          nt.className = "listedTree";
          forest.appendChild(nt);
          alert("Selected tree successfully added.");
          loadAddedTrees();
        } else if (this.response.message == "existing") alert("Selected tree is already added.");
        else if (this.response.message == "notfound") alert("The tree is not found.");
      }
  });
}

function submit(){
    var submitData = data.skills;
    for (var i = 0; i < submitData.length; ++i) {
        delete submitData[i].itemcontainer;
    }
    request('POST', '/set/submitall', submitData, function() {
        if(this.readyState == 4 && this.status == 200) {
          window.open("/user/", "_self");
        }
    });
}

function logout(){
    localStorage.setItem("loginToken", "");
    window.open("/", "_self");
}

function startLoader () {
    PIXI.loader.add("pictures/skillborder.png")
                //.add("tree.png")
                .add("pictures/back.png")
                .add("pictures/tick.png");
    for (var i = 0; i < data.skills.length; ++i) {
        PIXI.loader.add(data.skills[i].skillIcon.toString());
    }
    PIXI.loader.load(function () {
        showTree(data.mainTree);
    });
    loadAddedTrees();
}

app.stage = new PIXI.display.Stage();
app.stage.group.enableSort = true;

// CHART

document.getElementById("openchart").onclick = showChart;

var chartContainer = new PIXI.Container();

function showChart() {
    if (tree != undefined) {
        app.stage.removeChild(tree.treeContainer);
        tree = undefined;
    }

    document.getElementById("openchart").value = "Close Chart";
    document.getElementById("openchart").onclick = function() {
        showTree(selectedTreeName);
    };

    chartContainer = new PIXI.Container();

    var sliceCount = data.categories.length;

    //initialize chart variables
    var x = 0;
    var y = 0;
    var width = 240;
    var h1 = 60;
    var h2 = h1 + width;

    for (var i = 0; i < sliceCount; i++) {
        var tempContainer = new PIXI.Container();

        var skills = data.skills.filter(obj => obj.categoryName == data.categories[i].name);
        var sumAP = skills.sum("achievedPoint");
        var sumMP = skills.sum("maxPoint");
        var percent = 0;
        if (sumMP != 0) percent = sumAP / sumMP;

        h2 = h1 + width;
        var s = (i * (360 / sliceCount) * Math.PI) / 180;
        var e = ((i + 1) * (360 / sliceCount) * Math.PI) / 180;

        var slice = new PIXI.Graphics();
        slice.lineStyle(3, 0x000000);

        slice.moveTo(x + Math.cos(e) * h1, y + Math.sin(e) * h1);
        slice.beginFill(0xFFFFFF);
        slice.arc(x, y, h1, e, s, true);
        slice.arc(x, y, h2, s, e, false);
        slice.lineTo(x + Math.cos(e) * h1, y + Math.sin(e) * h1);
        slice.endFill();

        tempContainer.addChild(slice);

        h2 = h1 + (width * percent);
        var innerSlice = new PIXI.Graphics();
        innerSlice.lineStyle(3, 0x000000);
        innerSlice.moveTo(x + Math.cos(e) * h1, y + Math.sin(e) * h1);
        innerSlice.beginFill(0xFF0000);
        innerSlice.arc(x, y, h1, e, s, true);
        innerSlice.arc(x, y, h2, s, e, false);
        innerSlice.lineTo(x + Math.cos(e) * h1, y + Math.sin(e) * h1);
        innerSlice.endFill();

        tempContainer.addChild(innerSlice);


        //Clickabke slices ----------------------------
        /*sliceContainer[i].buttonMode = true;
        sliceContainer[i].interactive = true;

        sliceContainer[i]
                    .on('pointerover', function() {
                        this.alpha = 0.75;
                        app.renderer.render(app.stage);
                    })
                    .on('pointerout', function() {
                        this.alpha = 1;
                        app.renderer.render(app.stage);
                    })
                    .on('pointerdown', function() {
                        hideChart();
                        showTree(this.id);
                    });*/

        // creates tree name at the chart
        //var text = new PIXI.Text(treeData.find(obj => obj.treeID == userData[i].treeID).treeName, {fill: '#ffffff', wordWrap: true, wordWrapWidth: 200, align: 'center'});

        //Write category names
        var text = new PIXI.Text(data.categories[i].name, {fill: '#ffffff', wordWrap: true, wordWrapWidth: 200, align: 'center'});
        var points = [];
        var radius = 320 + (text.height / 29 - 1) * 15;
        var pointsCount = 20;
        if (Math.floor(sliceCount / 2) <= i) {
            for (var j = 0; j < pointsCount; j++) {
                var px = radius * Math.cos(j * Math.PI * 2 * text.width / (250 * 8 / sliceCount) / pointsCount / sliceCount + s);
                var py = radius * Math.sin(j * Math.PI * 2 * text.width / (250 * 8 / sliceCount) / pointsCount / sliceCount + s);
                points.push(new PIXI.Point(px, py));
            }
        } else {
            for (var j = pointsCount - 1; j > 0; --j) {
                var px = radius * Math.cos(j * Math.PI * 2 * text.width / (250 * 8 / sliceCount) / pointsCount / sliceCount + s);
                var py = radius * Math.sin(j * Math.PI * 2 * text.width / (250 * 8 / sliceCount) / pointsCount / sliceCount + s);
                points.push(new PIXI.Point(px, py));
            }
        }

        var rope = new PIXI.mesh.Rope(text.texture, points);
        rope.rotation = (Math.PI * 2 / sliceCount - text.width / (240 * 8 / sliceCount) * Math.PI * 2 / sliceCount * 0.95) / 2;
        tempContainer.addChild(rope);

        chartContainer.addChild(tempContainer);
    }

    /*var logo = new PIXI.Sprite(PIXI.loader.resources["tree.png"].texture);
    logo.anchor.set(0.5, 0.5);
    //logo.position.set(window.innerWidth / 2, window.innerHeight / 2);
    logo.scale.set(0.42);
    //app.stage.addChild(logo);
    chartContainer.addChild(logo);*/

    chartContainer.position.set((window.innerWidth) / 2, (window.innerHeight - 70) / 2);
    app.stage.addChild(chartContainer);

    // scale chart
    var ratio = chartContainer.width / chartContainer.height;
    if (window.innerWidth < window.innerHeight - 70) {
        chartContainer.width = window.innerWidth - 40;
        chartContainer.height = (window.innerWidth - 40) / ratio;
    } else {
        chartContainer.width = (window.innerHeight - 70) * ratio;
        chartContainer.height = window.innerHeight - 70;
    }

    //app.renderer.render(app.stage);
}

window.onresize = function () {
    app.renderer.resize(window.innerWidth, window.innerHeight - 30);

    if (chartContainer != undefined) {
        var ratio = chartContainer.width / chartContainer.height;
        if (window.innerWidth < window.innerHeight - 30) {
            chartContainer.width = window.innerWidth - 40;
            chartContainer.height = (window.innerWidth - 40) / ratio;
        } else {
            chartContainer.width = (window.innerHeight - 70) * ratio;
            chartContainer.height = window.innerHeight - 70;
        }

        chartContainer.position.set((window.innerWidth) / 2, (window.innerHeight - 30) / 2);
    }

    if (tree != undefined) {
        tree.treeContainer.position.set(app.renderer.width / 2 + tree.treeContainer.width / 2, app.renderer.height / 2);
    }

    app.renderer.render(app.stage);
};

// TREE

// app.localLoader is a loader for skillicons (when a tree is opened, we load only that tree's skillicons)
// PIXI.loader is global, it loads the back button, skillborder, tree,...

var selectedTreeName;
var tree = undefined;

function showTree (treeName) {
    // load the tree's pictures
    if (tree != undefined) {
        app.stage.removeChild(tree.treeContainer);
        tree = undefined;
    }
    selectedTreeName = treeName;

    var skills = new Array();
    for (var j = 0; j < data.trees.find(obj => obj.name == treeName).skillNames.length; ++j) {
        var skillName = data.trees.find(obj => obj.name == treeName).skillNames[j];
        var skill = data.skills.find(obj => obj.name == skillName);

        skills.push(skill);
    }

    if (chartContainer != undefined) {
        app.stage.removeChild(chartContainer);
        chartContainer = undefined;
    }

    document.getElementById("openchart").value = "Open Chart";
    document.getElementById("openchart").onclick = showChart;

    tree = new Tree(app, skills);
    app.stage.addChild(tree.treeContainer);
    tree.treeContainer.pivot.set(tree.treeContainer.width / 2, tree.treeContainer.height / 2);
    tree.treeContainer.position.set(app.renderer.width / 2 + tree.treeContainer.width / 2, app.renderer.height / 2);

    tree.treeContainer.alpha = 1;
    tree.skills[0].itemcontainer.refreshAvaliability();
    app.renderer.render(app.stage);
    document.getElementById("pixiCanvas").style.visibility = "visible";
    app.start();
    /*var fadein = function (delta) {
        tree.treeContainer.alpha += .05;
        if (tree.treeContainer.alpha == 1) {
            app.ticker.remove(fadein);
            app.stop();
        }
    };
    app.ticker.add(fadein);*/
}



/*function openEditor () {
    app.stage.removeChild(tree.treeContainer);
    app.localLoader.destroy();
    tree = undefined;

    // load the tree's pictures
    app.localLoader = new PIXI.loaders.Loader();
    var treeID2 = 0;
    var editedTree = data.trees.find(obj => obj.id == treeID2);
    for(var i = 0; i < editedTree.skillIDs.length; i++){
      var skill = data.skills.find(obj => obj.id == editedTree.skillIDs[i]);
      app.localLoader.add(skill.skillIcon.toString());
    }

    app.localLoader.load(function () {
        app.renderer.resize(.75 * window.innerWidth - 150, window.innerHeight - 30);

        // passes the details of the skills used by the tree.
        for(var i = 0; i < editedTree.skillIDs.length; i++){
          editedTree.skills[i] = data.skills.find(obj => obj.id == editedTree.skillIDs[i]);
        }
        //tree = new EditorTree(app, treeID2, treeData.find(obj => obj.treeID == treeID2), 150, 30);
        // needs a new constructor, where we pass the expanded editedTree, the app, and xy.
        tree = new EditorTree(app, editedTree, 150, 30);

        app.stage.addChild(tree.treeContainer);

        app.renderer.render(app.stage);
    });
}*/

/*
*   TREE CREATOR
*/

function create() {
    var canvas = document.getElementById("pixiCanvas");
    canvas.style.display = "none";

    var creator = document.getElementById("creator");
    creator.style.display = "grid";

    document.getElementById("openCreator").value = "Close Creator";
    document.getElementById("openCreator").onclick = function() {
        creator.style.display = "none";
        canvas.style.display = "block";
        document.getElementById("openCreator").value = "Create Tree";
        document.getElementById("openCreator").onclick = create;
    };

    creator.style.width = canvas.style.width;
    creator.style.height = canvas.style.height;

    var addBtn = document.getElementById("addToTree");
    var skillList = document.getElementById("skillList");
    var skillsToAdd = [];
    addBtn.onclick = function () {
        var skill = {value: document.getElementById('skillSearch').value};

        request('POST', '/set/getskill', skill, function() {
            if(this.readyState == 4 && this.status == 200) {
                if (this.response.success) {
                    if (skillsToAdd.find(obj => obj.name == this.response.skill.name) == undefined) {
                        if (this.response.dependency.length > 0) {
                            var text = "The selected skill depends on the following skills. Do you want to add these?\n";
                            for (var i = 0; i < this.response.dependency.length; ++i) {
                                text += this.response.dependency[i].name + "\n";
                            }
                            if (confirm(text)) {
                                skillsToAdd.push(this.response.skill);
                                var option = document.createElement("option");
                                option.text = this.response.skill.name;
                                skillList.add(option);
                                for (var i = 0; i < this.response.dependency.length; ++i) {
                                    if (skillsToAdd.find(obj => obj.name == this.response.dependency[i].name) == undefined) {
                                        skillsToAdd.push(this.response.dependency[i]);
                                        var option = document.createElement("option");
                                        option.text = this.response.dependency[i].name;
                                        skillList.add(option);
                                    }
                                }
                            }
                        } else {
                            skillsToAdd.push(this.response.skill);
                            var option = document.createElement("option");
                            option.text = this.response.skill.name;
                            skillList.add(option);
                        }
                    } else alert("You have already added this skill");
                } else alert("Skill is not found");
                /*skillSearchResult.innerText = "";
                for (var i = 0; i < sch.response.length; i++) {
                    var mya = document.createElement('option');
                    mya.value = sch.response[i].name;
                    skillSearchResult.appendChild(mya);
                }*/
            }
        });
    };

    var createSkillBtn = document.getElementById("createSkill");
    createSkillBtn.onclick = function () {
        var modal = document.getElementById("newSkillModal");
        modal.style.display = "block";

        var span = document.getElementById("closeSkillModal");

        span.onclick = function() {
            modal.style.display = "none";
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }

        var catSelect = document.getElementById("newSkillCat");
        for (var i = 0; i < data.categories.length; ++i) {
            var option = document.createElement("option");
            option.text = data.categories[i].name;
            catSelect.add(option);
        }

        var save = document.getElementById("saveSkillBtn");
        save.onclick = function () {
            var pointsTable = document.getElementById('pointsTable');
            var pointsNum = pointsTable.rows.length - 1;
            var pointDescription = [];
            for (i = 1; i < pointsNum + 1; ++i) pointDescription.push(pointsTable.rows[i].cells[1].children[0].value);

            var parentsTable = document.getElementById('parentsTable');
            var parents = [];
            for (i = 1; i < parentsTable.rows.length; ++i) parents.push(parentsTable.rows[i].cells[0].children[0].value);

            var childrenTable = document.getElementById('childrenTable');
            var children = [];
            for (i = 1; i < childrenTable.rows.length; ++i) {
                children.push({
                    name: childrenTable.rows[i].cells[0].children[0].value,
                    minPoint: childrenTable.rows[i].cells[1].children[0].value,
                    recommended: !childrenTable.rows[i].cells[2].children[0].checked
                });
            }

            var trainingsTable = document.getElementById('trainingsTable');
            var trainings = [];
            for (i = 1; i < trainingsTable.rows.length; ++i) {
                trainings.push({
                    name: trainingsTable.rows[i].cells[0].children[0].value,
                    level: trainingsTable.rows[i].cells[1].children[0].value,
                    description: trainingsTable.rows[i].cells[2].children[0].value,
                    url: trainingsTable.rows[i].cells[3].children[0].value
                });
            }

            var skillData = {
                name: document.getElementById('newSkillName').value,
                description: document.getElementById('newSkillDesc').value,
                skillIcon: document.getElementById('newSkillIcon').value,
                categoryName: catSelect.value,
                maxPoint: pointsNum,
                pointDescription: pointDescription,
                parents: parents,
                children: children,
                trainings: trainings,
                forApprove: document.getElementById('forApprove').checked
            };

            request('POST', '/set/newskill', skillData, function () {
                if (this.readyState == 4 && this.status == 200) {
                    if (this.response.success) {
                        modal.style.display = "none";
                    }
                }
            });
        };
    };

    var deleteBtn = document.getElementById("deleteFromList");
    deleteBtn.onclick = function () {
        skillsToAdd = skillsToAdd.filter(obj => obj.name != skillList.options[skillList.selectedIndex].text);
        skillList.remove(skillList.selectedIndex);
        // nem kene engednie, hogy torolje a dependecyt vagy mashol kell ezt ellenorizni
    };

    var createBtn = document.getElementById("createTree");
    createBtn.onclick = function () {
        if (document.getElementById('treeName').value.length > 0) {
            if (skillsToAdd.length > 0) {
                var skillNames = [];
                for (var i = 0; i < skillsToAdd.length; ++i) skillNames.push(skillsToAdd[i]);

                var treeData = {
                    name: document.getElementById('treeName').value,
                    focusArea: document.getElementById('focusarea').value,
                    skillNames: skillNames
                };

                request('POST', '/set/newtree', treeData, function () {
                    if (this.readyState == 4 && this.status == 200) {
                        if (this.response.success) window.open("/user/", "_self");
                        else if (this.response.message == "treeexists") alert("There is already a tree with this name");
                    }
                });
            } else alert("Please add at least one skill to the tree");
        } else alert("Please provide a name to the tree");
    };
}

function searchSkillsByName(){
    var skillToSearch = {value: document.getElementById('skillSearch').value};
    var skillSearchResult = document.getElementById('skillSearchResult');
    request('POST', '/set/searchSkillsByName', skillToSearch, function () {
        if (this.readyState == 4 && this.status == 200) {
            skillSearchResult.innerText = "";
            for (var i = 0; i < this.response.length; i++) {
                var mya = document.createElement('option');
                mya.value = this.response[i].name;
                skillSearchResult.appendChild(mya);
            }
        }
    });
}

function deleteRow(table, row) {
  var i = row.parentNode.parentNode.rowIndex;
  document.getElementById(table).deleteRow(i);
}

function addRow(table) {
  var x = document.getElementById(table);
  var new_row = x.rows[1].cloneNode(true);
  var len = x.rows.length;
  if (table == 'pointsTable') new_row.cells[0].innerText = len;

  var inp1 = new_row.cells[1].getElementsByTagName('input')[0];
  inp1.id += len;
  inp1.value = '';
  x.appendChild(new_row);
}

/*
*   TREE CREATOR END
*/

// helper functions

function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
}

Array.prototype.sum = function (prop) {
    var total = 0;

    for (var i = 0; i < this.length; ++i) {
        total += this[i][prop];
    }

    return total;
}

function request (type, url, data, callback) {
    var req = new XMLHttpRequest();
    req.open(type, url, true);
    req.setRequestHeader('Content-type', 'application/json');
    req.setRequestHeader('x-access-token', localStorage.getItem("loginToken"));
    req.responseType = "json";
    req.onreadystatechange = callback;
    req.send(JSON.stringify(data));
}