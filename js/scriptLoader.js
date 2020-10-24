// From: https://stackoverflow.com/questions/14644558/call-javascript-function-after-script-is-loaded
function loadScript(url, callback) {
  var script = document.createElement( "script" )
  script.type = "text/javascript";
  if(script.readyState) {  // only required for IE <9
    script.onreadystatechange = function() {
      if ( script.readyState === "loaded" || script.readyState === "complete" ) {
        script.onreadystatechange = null;
        callback();
      }
    };
  } else {  // other browsers
    script.onload = function() {
      callback();
    };
  }

  script.src = url;
  document.getElementsByTagName( "head" )[0].appendChild( script );
}
