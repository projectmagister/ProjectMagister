const { remote } = require("electron");
const path = require("path");
const url = require("url");
const moment = require("moment");
const chart = require("chart.js");
const _ = require("lodash");
moment.locale("nl");

var m = remote.getGlobal("m");
var today = new Date();
var agendaDate = new Date();

if ([5, 6].includes(today.getDay())) {
    agendaDate.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7);
} else {
    agendaDate.setDate(today.getDate() + 1);
}

var dayFormat = moment(agendaDate).format("dddd");

var app = new Vue({
    el: "#app",
    data: {
        isBeta: true,
        agendaDate: "",
        showDoneHomework: false,
        showReadMail: false,
        profile: {
            username: "Onbekende gebruiker",
            imgUrl: "./img/user.png"
        },
        magister: {
            appointments: [],
            messages: [],
            grades: [],
            assignments: [],
            filterMessages(readState) {
                let array = [];
                for (let i = 0; i < this.messages.length; i++) {
                    const element = this.messages[i];
                    if (element.isRead() == readState)
                        array.push(element);
                }

                return array;
            },

            filterHomework(doneState) {
                let array = [];
                for (let i = 0; i < this.appointments.length; i++) {
                    const element = this.appointments[i];
                    if (element.isDone() == doneState && element.content().length > 0)
                        array.push(element);
                }

                return array;
            },
            getLastGrades(maxItems = 5) {
                let lastGrades = [];
                for (let i = 0; i < this.grades.length; i++) {
                    if (i == maxItems)
                        break;

                    const element = this.grades[i];
                    if (element.counts() && element.weight() > 0) {
                        lastGrades.push(element);
                    }
                }

                return lastGrades;
            },
            isFailed(grade) {
                let gradeFloat;
                gradeFloat = parseFloat(grade.replace(",", "."));
                return gradeFloat < 5.5;
            },
            isWellDone(grade) {
                let gradeFloat;
                gradeFloat = parseFloat(grade.replace(",", "."));
                return gradeFloat > 8.0;
            }
        },
        formatTime(date) {
            return moment(date).format("H:mm");
        },
        trimContent(str, maxLength = 120) {
            let finalString = "";

            finalString = str
                .split("\n").join(" ")
                .split("\r").join(" ");

            if (str.length > maxLength) {
                finalString = str.substring(0, maxLength - 3) + "...";
            } else {
                finalString = str;
            }

            return finalString;
        },
        getFileIcon(fileName) {
            var extIndex = fileName.lastIndexOf(".");
            var ext = fileName.substring(extIndex + 1);

            if (ext == "doc" || ext == "docx") {
                return "fa-file-word";

            } else if (ext == "ppt" || ext == "pptx" || ext == "ppsx") {
                return "fa-file-powerpoint";

            } else if (ext == "xls" || ext == "xlsx") {
                return "fa-file-excel";

            } else if (ext == "pdf") {
                return "fa-file-pdf";

            } else {
                return "fa-file";
            }
        },
        getAttachmentTitle(file) {
            return "Naam:\t" + file.name() + "\n" +
                   "Grootte:\t" + Math.round(file.size() / 1024) + " KB" + "\n\n" +
                   "Klik om te downloaden.";
        }
    }
});

function refreshGraph(grades) {
    var months = [
        "januari", "februari",
        "maart", "april",
        "mei", "juni",
        "juli", "augustus",
        "september", "oktober",
        "november", "december"
    ];

    var chartData = {
        labels: [],
        datasets: [{
            label: "Gemiddeld behaald cijfer",
            data: [],
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1.5
        }]
    };

    grades.forEach(i => {
        var date = new Date(i.dateFilledIn()).getMonth();
        var monthName = months[date];

        if (!chartData.labels.includes(monthName)) {

            var totalThisMonth = 0.0;
            var averageThisMonth = 0.0;
            var entriesThisMonth = 0;

            grades.forEach(gradeThisMonth => {
                if (new Date(gradeThisMonth.dateFilledIn()).getMonth() == date) {
                    totalThisMonth += parseFloat(gradeThisMonth.grade().replace(",", "."));
                    entriesThisMonth++;
                }
            });

            averageThisMonth = totalThisMonth / entriesThisMonth;

            chartData.labels.push(monthName);
            chartData.datasets[0].data.push(Math.round(averageThisMonth * 100) / 100);
        }
    });

    var context = document.getElementById("perfChart").getContext("2d");
    var perfChart = new Chart(context, {
        type: "line",
        data: chartData,
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}

function refreshData() {
    m.appointments(agendaDate, agendaDate, function (e, appointments) {
        app.magister.appointments = appointments;
    });
    
    m.currentCourse(function (courseErr, course) {
        course.grades(function(e, grades) {
            grades.sort(function (a, b) {
                var dateA = new Date(a.dateFilledIn());
                var dateB = new Date(b.dateFilledIn());
                return dateB - dateA;
            });
            
            var validGrades = [];
            grades.forEach(i => {
                if (i.counts() && i.weight() > 0)
                    validGrades.push(i);
            });
    
            app.magister.grades = grades;
            refreshGraph(validGrades);
        });
    });
    
    m.inbox().messages(function (e, messages) {
        app.magister.messages = messages;
    });
    
    m.assignments(function (e, assignments) {
        app.magister.assignments = assignments;
    });
}

app.profile.username = m.profileInfo().fullName();
app.agendaDate = dayFormat;

if (m != null) {
    console.log("Successfully authenticated with Magister!");
} else {
    console.log("Unable to authenticate with Magister.");
}

refreshData();