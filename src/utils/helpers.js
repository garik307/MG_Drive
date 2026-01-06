const {
    escape,
    unescape
} = require('html-escaper');

class Helpers {
    // Encode all
    encode(data) {
        // object
        if (typeof data == 'object') {
            if (Object.keys(data).length) {
                for (let key in data) {
                    data[key] = this.encode(data[key]);
                }
            }
        }
        // string
        if (typeof data == 'string') {
            data = escape(data);
        }
        return data;
    }
    // Decode
    decode(str, type = 'html') {
        let res = '';
        if (str) {
            res = type == 'text' ? str.replaceAll('\n', '<br>') : unescape(str);
        }
        return res;
    }

    // date - Format
    getDate(dateStrISO, type = 'full') {
        // date object
        let date = new Date(dateStrISO);
        // data of date
        let year = date.getFullYear(),
            month = date.getMonth() + 1,
            day = date.getDate(),
            hours = date.getHours(),
            minutes = date.getMinutes(),
            seconds = date.getSeconds();

        // add 0
        if (day < 10) day = '0' + day;
        if (month < 10) month = '0' + month;
        if (hours < 10) hours = '0' + hours;
        if (minutes < 10) minutes = '0' + minutes;
        if (seconds < 10) seconds = '0' + seconds;

        // result
        let result;
        if (type == 'full') {
            result = `${day}.${month}.${year} | ${hours}:${minutes}:${seconds}`;
        }
        if (type == 'date') {
            result = `${day}.${month}.${year}`;
        }
        if (type == 'hours') {
            result = `${hours}:${minutes}:${seconds}`;
        }
        return result;
    }

    timeSince(dateTimeString) {
        const now = new Date();
        const inputDate = new Date(dateTimeString);

        let years = now.getFullYear() - inputDate.getFullYear();
        let months = now.getMonth() - inputDate.getMonth();
        let days = now.getDate() - inputDate.getDate();
        let hours = now.getHours() - inputDate.getHours();
        let minutes = now.getMinutes() - inputDate.getMinutes();

        if (minutes < 0) {
            hours -= 1;
            minutes += 60;
        }

        if (hours < 0) {
            days -= 1;
            hours += 24;
        }

        if (days < 0) {
            months -= 1;
            const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += prevMonth.getDate();
        }

        if (months < 0) {
            years -= 1;
            months += 12;
        }

        if (years > 0) {
            return `${years} տարի, ${months} ամիս`;
        } else if (months > 0) {
            return `${months} ամիս, ${days} օր`;
        } else if (days > 0) {
            return `${days} օր, ${hours} ժամ`;
        } else if (hours > 0) {
            return `${hours} ժամ, ${minutes} րոպե`;
        } else {
            return `${minutes} րոպե`;
        }
    }

    // filterObj req.body
    filterObj(obj, ...allowedFields) {
        const newObj = {};
        Object.keys(obj).forEach(el => {
            if (allowedFields.includes(el)) {
                newObj[el] = obj[el];
            }
        });
        return newObj;
    }
}

module.exports = new Helpers();