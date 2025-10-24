const Joi = require('joi');

const validatePayment = (req, res, next) => {
    const schema = Joi.object({
        data: Joi.string().required(),
        paymentmethood: Joi.string().valid('Cash', 'UPI', 'Bank Transfer', 'Card').required(),
        status: Joi.string().valid('Pending', 'Approved', 'Rejected')
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

module.exports = { validatePayment };