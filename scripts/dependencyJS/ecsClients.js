var EcsClients = {
    async getConfig() {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == XMLHttpRequest.DONE) {   // XMLHttpRequest.DONE == 4
                if (xmlhttp.status == 200) {
                    ecsClientFilter = JSON.parse(xmlhttp.responseText);
                    return ecsClientFilter.DependencyTracker.Teams;                  
                }
                else if (xmlhttp.status == 400) {
                    alert('There was an error 400');
                    return undefined;
                }
                else {
                    alert('something else other than 200 was returned');
                    return undefined;
                }
            }
        };

        xmlhttp.open("GET", "https://b.config.skype.net/config/v1/CSE-Teams/1.0.0.0/INT-PLT-EIP-DependencyTracker?Environment=DependencyTracker", true);
        xmlhttp.send();
    }
}

module.exports = EcsClients