/*
*   positioning of the skills and drawconnectionlines not working
*/

class Tree {
    constructor (app, skills, posX, posY) {
        this.skills = skills;
        this.treeContainer = new PIXI.Container();
        this.treeContainer.enableSort = true;

        this.treeContainer.interactive = true;

        this.treeContainer
            .on('pointerdown', this.onDragStart)
            .on('pointerup', this.onDragEnd)
            .on('pointerupoutside', this.onDragEnd)
            .on('pointermove', this.onDragMove);

        var skillGroup = new PIXI.display.Group(0, true);
        var skillLayer = new PIXI.display.Layer(skillGroup);
        skillLayer.group.enableSort = true;
        app.stage.addChild(skillLayer);

        for (var j = 0; j < this.skills.length; ++j) {
            this.skills[j].itemcontainer = new ItemContainer(app, this.skills, this.skills[j].id);

            // Positioning of the containers dynamically by level and by index inside level
            /*this.treeData.skills[j].itemcontainer.container.position.x = i * 130 + (app.renderer.width - levelLength * 130) / 2 + posX; // ?????
            this.treeData.skills[j].itemcontainer.container.position.y = this.treeData.skills[j].level * 150 + posY;*/

            this.skills[j].itemcontainer.container.parentLayer = skillLayer;
            this.treeContainer.addChild(this.skills[j].itemcontainer.container);
        }

        this.drawConnectionLines();
    }

    drawConnectionLines() {
        var connectionGroup = new PIXI.display.Group(-1, false);

        for (var j = 0; j < this.skills.length; ++j) {
            if (this.skills[j].children !== undefined) {
                for (var k = 0; k < this.skills[j].children.length; ++k) {
                    var child = this.skills.find(obj => obj.id == this.skills[j].children[k].id);

                    // Draw the line
                    var connection = new PIXI.Graphics();
                    connection.lineStyle(4, 0xffffff);
                    connection.moveTo(this.skills[j].itemcontainer.container.x + this.skills[j].itemcontainer.skillborder.width / 2, this.skills[j].itemcontainer.container.position.y + this.skills[j].itemcontainer.skillborder.height - 8);
                    connection.lineTo(child.itemcontainer.container.position.x + child.itemcontainer.skillborder.width / 2, child.itemcontainer.container.position.y + 5);

                    // Add the line
                    this.treeContainer.addChild(connection);
                    connection.parentGroup = connectionGroup;

                    // Saving child's zero skill level parents
                    if (this.skills[j].skillLevel == 0 || this.treeData.skills[j].zeroSLParents != undefined) {
                        child.itemcontainer.disable();

                        if (child.zeroSLParents === undefined) {
                            child.zeroSLParents = new Array();
                        }
                        child.zeroSLParents.push({skillID: this.treeData.skills[j].skillID});
                    }
                }
            }
        }

        app.stage.addChild(new PIXI.display.Layer(connectionGroup));
    }

    /*onDragStart(event) {
        event.drag = false;
        var obj = event.currentTarget;
        obj.dragData = event.data;
        obj.dragging = 1;
        obj.dragPointerStart = event.data.getLocalPosition(obj.parent);
        obj.dragObjStart = new PIXI.Point();
        obj.dragObjStart.copy(obj.position);
        obj.dragGlobalStart = new PIXI.Point();
        obj.dragGlobalStart.copy(event.data.global);

        app.start();
    }

    // not sure if we need dragging
    onDragEnd(event) {
        var obj = event.currentTarget;
        if (!obj.dragging) return;

        obj.dragging = 0;
        obj.dragData = null;

        app.stop();
    }

    onDragMove(event) {
        var obj = event.currentTarget;
        if (!obj.dragging) return;
        var data = obj.dragData;
        if (obj.dragging == 1) {

            // click or drag?
            if (Math.abs(data.global.x - obj.dragGlobalStart.x) +
                Math.abs(data.global.y - obj.dragGlobalStart.y) >= 5) {
                // DRAG
                obj.dragging = 2;
            }
        }
        if (obj.dragging == 2) {
            event.drag = true;
            var dragPointerEnd = data.getLocalPosition(obj.parent);
            // DRAG
            obj.position.set(
                obj.dragObjStart.x + (dragPointerEnd.x - obj.dragPointerStart.x),
                obj.dragObjStart.y + (dragPointerEnd.y - obj.dragPointerStart.y)
            );
        }
    }*/
}
