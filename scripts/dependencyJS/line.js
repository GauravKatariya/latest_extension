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
        var lineElement1 = this.findElement(key1, key1 + "-" + key2)
        var lineElement2 = this.findElement(key2, key2 + "-" + key1)
        this.removeLineObject(lineElement1.line)
        this.deleteElement(key1, lineElement1)
        this.deleteElement(key2, lineElement2)
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
        try {
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
                { startPlug: 'disc', color: colorCode , size : 3});
            var key = key1 + "-" + key2
            dict[key1].push({ "id": key, "line": line })
            key = key2 + "-" + key1
            dict[key2].push({ "id": key, "line": line })
            allLines.push(line);
        }
        catch (err) {
            console.log(source + " , " + destination + " , " + sprint_wi + " , " + sprint_dwi + " , " + title_dwi + " , " + ": - failed");
        }
    },
    createLines(workItemsWithDependency, areaPath) {
        var workItemsWithDependencyteamwise = [];
        for (var index = 0; index < areaPath.length; index++)
        {
           var workItems = DataFilter.getWorkItemsWithDependencyTeamwise(workItemsWithDependency, areaPath[index]);
           if (workItems != undefined && workItems.length > 0)
           {
               workItems.forEach(element => workItemsWithDependencyteamwise.push(element));
           }
        }  

        if (workItemsWithDependencyteamwise ==  undefined || workItemsWithDependency.length == 0)
        {
            return "";
        }        
        
        workItemsWithDependencyteamwise.forEach(wi => {
            var sprintPathArray = wi["IterationPath"].split("\\")
            var sprint_wi;
            sprintPathArray.length == 0 ? sprint_wi = wi["IterationPath"] : sprint_wi = sprintPathArray[sprintPathArray.length - 1];
            sprint_wi = (sprint_wi).replace("-", "");
            //sprint_wi = parseInt(sprint_wi)

            if (wi.DependentOn != undefined && wi.DependentOn.length > 0) {
                wi.DependentOn.forEach(dwi => {
                    if (global.skipList.find(x => x == dwi) == undefined) {
                        var dwi_sprintPath = (workItemsWithDependency.filter(wis => wis.Id == dwi))[0]["IterationPath"];
                        var dwi_sprintPathArray = dwi_sprintPath.split("\\");
                        var sprint_dwi;
                        dwi_sprintPathArray.length == 0 ? sprint_dwi = dwi_sprintPath : sprint_dwi = dwi_sprintPathArray[dwi_sprintPathArray.length - 1];
                        var title_dwi = workItemsWithDependency.filter(wis => wis.Id == dwi)[0]["Title"];
                        sprint_dwi = (sprint_dwi).replace("-", "");
                        //sprint_dwi = parseInt(sprint_dwi)

                        key1 = wi.Id
                        key2 = dwi
                        var source = document.getElementById(key1)
                        var destination = document.getElementById(key2)
                        this.drawLine(source, destination, sprint_wi, sprint_dwi, title_dwi);
                    }
                })
            }
            if (wi.DependentBy != undefined && wi.DependentBy.length > 0) {
                wi.DependentBy.forEach(dwi => {
                    if (global.skipList.find(x => x == dwi) == undefined) {
                        var dwi_sprintPath = (workItemsWithDependency.filter(wis => wis.Id == dwi))[0]["IterationPath"];
                        var dwi_sprintPathArray = dwi_sprintPath.split("\\");
                        var sprint_dwi;
                        dwi_sprintPathArray.length == 0 ? sprint_dwi = dwi_sprintPath : sprint_dwi = dwi_sprintPathArray[dwi_sprintPathArray.length - 1];
                        var title_dwi = workItemsWithDependency.filter(wis => wis.Id == dwi)[0]["Title"];
                        sprint_dwi = (sprint_dwi).replace("-", "");
                        //sprint_dwi = parseInt(sprint_dwi)

                        key1 = wi.Id
                        key2 = dwi
                        var destination = document.getElementById(key1)
                        var source = document.getElementById(key2)
                        this.drawLine(source, destination, sprint_dwi, sprint_wi, title_dwi);
                    }
                })
            }

        })
    }
}

module.exports = Line