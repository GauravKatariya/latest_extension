var DataFilter = require("../dependencyJS/dataFilter")

var Line = {
    removeLineObject(lineObject) {
        lineObject.remove()
    },

    deleteElement(key, element) {
        var index = dict[key].indexOf(element);
        if (index > -1) {
            dict[key].splice(index, 1);
        }
    },

    removeLine(key1, key2) {
        var lineElement1 = findElement(key1, key1 + "-" + key2)
        var lineElement2 = findElement(key2, key2 + "-" + key1)
        removeLineObject(lineElement1)
        deleteElement(key1, lineElement1)
        deleteElement(key2, lineElement2)
    },

    findElement(key, value) {
        var toBeReturned;
        dict[key].forEach(x => {
            if (x.id == value.trim()) {
                toBeReturned = x;
            }
        });
        return toBeReturned
    },

    drawLine(source, destination, sprint_wi, sprint_dwi, title_dwi) {
        var colorCode;

        if (title_dwi.includes("[Waiting to create work item]")) {
            colorCode = '#D7003C';
        }
        else if (sprint_wi == sprint_dwi) {
            colorCode = '#f8b47a';
        }
        else if (sprint_dwi > sprint_wi) {
            colorCode = '#D7003C';
        }
        else {
            colorCode = '#00D5AC';
        }

        line = new LeaderLine(source, destination,
            { startPlug: 'disc', color: colorCode });
        var key = key1 + "-" + key2
        dict[key1].push({ "id": key, "line": line })
        key = key2 + "-" + key1
        dict[key2].push({ "id": key, "line": line })
        allLines.push(line);
    },
    createLines(workItemsWithDependency, areaPath) {
        var workItemsWithDependencyteamwise = DataFilter.getWorkItemsWithDependencyTeamwise(workItemsWithDependency, areaPath)
        workItemsWithDependencyteamwise.forEach(wi => {
            var sprint_wi = (wi["IterationPath"]).replace("Integration Demo Project\\Sprint", "");
            sprint_wi = (sprint_wi).replace("-", "");
            sprint_wi = parseInt(sprint_wi)

            if (wi.DependentOn != undefined && wi.DependentOn.length > 0) {
                wi.DependentOn.forEach(dwi => {

                    var sprint_dwi = (workItemsWithDependency.filter(wis => wis.Id == dwi))[0]["IterationPath"].replace("Integration Demo Project\\Sprint", "");
                    var title_dwi = workItemsWithDependency.filter(wis => wis.Id == dwi)[0]["Title"];
                    sprint_dwi = (sprint_dwi).replace("-", "");
                    sprint_dwi = parseInt(sprint_dwi)

                    key1 = wi.Id
                    key2 = dwi
                    var source = document.getElementById(key1)
                    var destination = document.getElementById(key2)
                    this.drawLine(source, destination, sprint_wi, sprint_dwi, title_dwi);
                })
            }
            if (wi.DependentBy != undefined && wi.DependentBy.length > 0) {
                wi.DependentBy.forEach(dwi => {

                    var sprint_dwi = (workItemsWithDependency.filter(wis => wis.Id == dwi))[0]["IterationPath"].replace("Integration Demo Project\\Sprint", "");
                    var title_dwi = workItemsWithDependency.filter(wis => wis.Id == dwi)[0]["Title"];
                    sprint_dwi = (sprint_dwi).replace("-", "");
                    sprint_dwi = parseInt(sprint_dwi)

                    key1 = wi.Id
                    key2 = dwi
                    var destination = document.getElementById(key1)
                    var source = document.getElementById(key2)
                    this.drawLine(source, destination, sprint_wi, sprint_dwi, title_dwi);
                })
            }

        })
    }
}

module.exports = Line