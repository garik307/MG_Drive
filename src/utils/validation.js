const AppError = require('./appError');

class Validator {
    constructor(data) {
        this.data = data;
        this.errors = [];
    }

    required(field, name) {
        if (!this.data[field] || String(this.data[field]).trim() === '') {
            this.errors.push(`${name || field} is required`);
        }
        return this;
    }

    email(field) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.data[field] && !emailRegex.test(this.data[field])) {
            this.errors.push('Invalid email format');
        }
        return this;
    }

    phone(field) {
        // Regex for Armenian phone numbers: 0 followed by 8 digits (e.g., 091234567)
        const phoneRegex = /^0\d{8}$/;
        if (this.data[field] && !phoneRegex.test(this.data[field])) {
            this.errors.push('Phone number must match format 0xxxxxxxx (9 digits)');
        }
        return this;
    }

    min(field, length, name) {
        if (this.data[field] && this.data[field].length < length) {
            this.errors.push(`${name || field} must be at least ${length} characters`);
        }
        return this;
    }

    validate() {
        if (this.errors.length > 0) {
            throw new AppError(this.errors.join('. '), 400, 'VALIDATION_ERROR');
        }
    }
}

module.exports = Validator;
