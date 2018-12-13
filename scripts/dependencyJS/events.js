var Events = {
    reRenderOnScroll() {
        for (key in dict) {
            dict[key].forEach(element => {
                element["line"].position();
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
    addDropdownItems(list) {
        global.teamsList = list;
        list.forEach(element => {
            var x = document.getElementById("teamDropdownSelect");
            var option = document.createElement("option");
            option.text = element.name;
            option.value = element.name;
            x.add(option);
        });
        var DropdownHTMLElements = document.querySelectorAll('#teamDropdown');
        for (var i = 0; i < DropdownHTMLElements.length; ++i) {
            var Dropdown = new fabric['Dropdown'](DropdownHTMLElements[i]);
        }
    }
}

module.exports = Events