var Line = require("../dependencyJS/line")
var Events = {
    reRenderLines() {
        for (key in dict) {
            dict[key].forEach(element => {
                element["line"].position();
            })
        }
    },
    showDependencyContainer()
    {
        //$("#dependencyContainer").show();
        $("#displayNotMessage").hide();
    },
    hideDependencyContainer()
    {
        //$("#dependencyContainer").hide();
        $("#displayNotMessage").show();
    },
    showErrorMessage() {
        this.hideDependencyContainer();
        this.clearScreen();
        this.clearLines();
        this.disableSprintDropdown();
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
    disableSprintDropdown()
    {
        $('#sprintStartDropDown').prop("disabled", true);
        $('#sprintEndDropDown').prop("disabled", true);
    },
    enableSprintDropdown()
    {
        $('#sprintStartDropDown').prop("disabled", false);
        $('#sprintEndDropDown').prop("disabled", false);
    },
    clearLines() {
        global.dict = {}
        global.allLines.forEach(line => Line.removeLineObject(line))
        global.allLines = []
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
            $('#fullSizeButton').children().html("Summary")
        }
    },
    addDropdownItems(list, htmlId) {
        global.teamsList = list;
        var htmlId1 = "#" + htmlId
        
        var newOption = new Option("","", false, false);
        $(htmlId1).append(newOption).trigger('change');
        
        list.forEach(element => {

            var data = {
                id: element.name,
                text: element.name
            };
            
            var newOption = new Option(data.text, data.id, false, false);
            $(htmlId1).append(newOption).trigger('change');
        });

        $(htmlId1).prop("disabled", false);
    },
    addIterationDropdownItems(list, htmlId , selectedSprint) {
        var x = document.getElementById(htmlId);
        x.innerHTML = "";
        var htmlId1 = "#" + htmlId
        list.forEach(element => {
            var data = {
                id: element,
                text: element
            };
            
            if(element == selectedSprint)
                var newOption = new Option(data.text, data.id, false, true);
            else
                var newOption = new Option(data.text, data.id, false, false);
            $(htmlId1).append(newOption).trigger('change');
        });
        $(htmlId1).prop("disabled", false);
    }
}

module.exports = Events