document.addEventListener("DOMContentLoaded", () => {

    if(!document.getElementById("contacts")) return

    // Saturday
    const satOpen = document.getElementById("sat-open");
    const satFrom = document.getElementById("sat-from");
    const satTo = document.getElementById("sat-to");

    satOpen.addEventListener("change", () => {
        if (satOpen.checked) {
            satFrom.disabled = false;
            satTo.disabled = false;
            if (!satFrom.value) satFrom.value = "10:00";
            if (!satTo.value) satTo.value = "16:00";
        } else {
            satFrom.disabled = true;
            satTo.disabled = true;
            satFrom.value = "";
            satTo.value = "";
        }
    });

    // Sunday
    const sunOpen = document.getElementById("sun-open");
    const sunFrom = document.getElementById("sun-from");
    const sunTo = document.getElementById("sun-to");

    sunOpen.addEventListener("change", () => {
        if (sunOpen.checked) {
            sunFrom.disabled = false;
            sunTo.disabled = false;
            if (!sunFrom.value) sunFrom.value = "10:00";
            if (!sunTo.value) sunTo.value = "16:00";
        } else {
            sunFrom.disabled = true;
            sunTo.disabled = true;
            sunFrom.value = "";
            sunTo.value = "";
        }
    });

    workingHours();
});

function workingHours() {
    let wh = document.getElementById("contactData").dataset.workingHours;
    try {
        wh = JSON.parse(wh);
    } catch (e1) {
        try {
            wh = JSON.parse(JSON.parse(wh));
        } catch (e2) {
            wh = [];
        }
    }

    const weekdays = wh.find(x => x.days.includes("mon"));
    const saturday = wh.find(x => x.days.includes("sat"));
    const sunday = wh.find(x => x.days.includes("sun"));

    if (weekdays && weekdays.hours !== "closed") {
        const [start, end] = weekdays.hours.split("-");
        document.getElementById("wd-from").value = start;
        document.getElementById("wd-to").value = end;
    }

    const satOpen = document.getElementById("sat-open");
    const satFrom = document.getElementById("sat-from");
    const satTo = document.getElementById("sat-to");

    if (saturday) {
        if (saturday.hours === "closed") {
            satOpen.checked = false;
            satFrom.disabled = true;
            satTo.disabled = true;
        } else {
            satOpen.checked = true;
            satFrom.disabled = false;
            satTo.disabled = false;
            const [start, end] = saturday.hours.split("-");
            satFrom.value = start;
            satTo.value = end;
        }
    }

    const sunOpen = document.getElementById("sun-open");
    const sunFrom = document.getElementById("sun-from");
    const sunTo = document.getElementById("sun-to");

    if (sunday) {
        if (sunday.hours === "closed") {
            sunOpen.checked = false;
            sunFrom.disabled = true;
            sunTo.disabled = true;
        } else {
            sunOpen.checked = true;
            sunFrom.disabled = false;
            sunTo.disabled = false;
            const [start, end] = sunday.hours.split("-");
            sunFrom.value = start;
            sunTo.value = end;
        }
    }

    // 7) UPDATE PREVIEW
    if (weekdays) {
        document.getElementById("previewWeekdays").textContent =
            weekdays.hours === "closed" ? "Closed" : weekdays.hours.replace("-", " – ");
    }

    if (saturday) {
        document.getElementById("previewSaturday").textContent =
            saturday.hours === "closed" ? "Closed" : saturday.hours.replace("-", " – ");
    }

    if (sunday) {
        document.getElementById("previewSunday").textContent =
            sunday.hours === "closed" ? "Closed" : sunday.hours.replace("-", " – ");
    }
}