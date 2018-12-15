var Line = require("../dependencyJS/line")
var Events = {
    reRenderOnScroll() {
        for (key in dict) {
            dict[key].forEach(element => {
                element["line"].position();
            })
        }
    },
    showErrorMessage() {
        Events.clearScreen();
        Events.clearLines();
        Events.reInitializeSprintDropdown();
        document.getElementById("displayNotMessage").innerHTML = "Something went wrong!!"
    },
    clearScreen() {
        document.getElementById("displayNotMessage").innerHTML = "";
        document.getElementById("mainTableContainer").innerHTML = "";
        document.getElementById("teamGraph").innerHTML = "";
    },
    enableButton() {
        document.getElementById("fullSizeButton").style.display = "block"
        document.getElementById("goButton").style.display = "block"
    },
    disableButton() {
        document.getElementById("fullSizeButton").style.display = "none"
        document.getElementById("goButton").style.display = "none"
    },
    reInitializeSprintDropdown() {
        $('#sprintStart span').remove('.ms-Dropdown-title');
        $("#sprintStart ul").remove(".ms-Dropdown-items");
        document.getElementById("sprintStartSelect").innerHTML = "";

        document.getElementById("sprintEndSelect").innerHTML = "";
        $('#sprintEnd span').remove('.ms-Dropdown-title');
        $("#sprintEnd ul").remove(".ms-Dropdown-items");

    },
    clearLines() {
        for (key in dict) {
            dict[key].forEach(element => {
                var key2 = parseInt(element.id.split("-")[1])
                Line.removeLine(parseInt(key), key2);
            })
        }
    },
    toggleGraphandSummaryView() {
        if (document.getElementById("teamGraph").style.display == "" || document.getElementById("teamGraph").style.display == "none") {
            document.getElementById("teamGraph").style.display = "block"
            document.getElementById("hideSection").style.display = "none"
            $('#fullSizeButton').children().html("Dependency View")
        }
        else {

            document.getElementById("teamGraph").style.display = "none"
            document.getElementById("hideSection").style.display = "block"
            $('#fullSizeButton').children().html("Summary view")
        }
    },
    addDropdownItems(list, htmlId1, htmlId2) {
        global.teamsList = list;
        list.forEach(element => {
            var x = document.getElementById(htmlId1);
            var option = document.createElement("option");
            option.text = element.name;
            option.value = element.name;
            x.add(option);
        });
        var DropdownHTMLElements = document.querySelectorAll(htmlId2);
        for (var i = 0; i < DropdownHTMLElements.length; ++i) {
            var Dropdown = new fabric['Dropdown'](DropdownHTMLElements[i]);
        }
    },
    addIterationDropdownItems(list, htmlId1, html2) {
        list.forEach(element => {
            var x = document.getElementById(htmlId1);
            var option = document.createElement("option");
            option.text = element;
            option.value = element;
            x.add(option);
        });
        var DropdownHTMLElements = document.querySelectorAll(html2);
        for (var i = 0; i < DropdownHTMLElements.length; ++i) {
            var Dropdown = new fabric['Dropdown'](DropdownHTMLElements[i]);
        }
    }
}

module.exports = Events