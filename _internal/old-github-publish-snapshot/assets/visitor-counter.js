(function () {
  "use strict";

  var counter = 1243;

  function ensureCounter() {
    var counterNode = document.getElementById("visitorCounter");
    if (!counterNode) {
      counterNode = document.createElement("div");
      counterNode.className = "visitor-counter";
      counterNode.id = "visitorCounter";
      counterNode.innerHTML = '<span id="counterValue">1243</span>';
      document.body.appendChild(counterNode);
    }

    var valueNode = document.getElementById("counterValue");
    if (valueNode) valueNode.textContent = String(counter);
  }

  function tickCounter() {
    var valueNode = document.getElementById("counterValue");
    if (!valueNode) return;
    counter += Math.floor(Math.random() * 3);
    valueNode.textContent = String(counter);
  }

  document.addEventListener("DOMContentLoaded", function () {
    ensureCounter();
    window.setInterval(tickCounter, 4000);
  });
})();