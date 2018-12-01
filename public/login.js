function validate() {
	var loginBox = document.getElementById("loginBox");
	var username = document.getElementById("username");
	var password = document.getElementById("password");

	//HTTP request to get the data from the API
	var httpRequest = new XMLHttpRequest();
	httpRequest.open('POST', '/auth', true);
	httpRequest.setRequestHeader('Content-type', 'application/json');
	httpRequest.responseType = "json";

	//Listener, if response comes, it runs.
	httpRequest.onreadystatechange = function() {
			if(httpRequest.readyState == 4 && httpRequest.status == 200) {
				if(httpRequest.response.success){
					localStorage.setItem("loginToken", httpRequest.response.token);
					window.open('/user','_self');
				} else {
                    showToast();
                }
			}
	};

	httpRequest.send(
		JSON.stringify({
			username: username.value,
			password: password.value
		})
	 );
	}

	//Activate toast
	function showToast() {
	var toast = document.getElementById("toast");

	toast.className = "show";

	setTimeout(function(){
		toast.className = ""
	}, 3000);
}