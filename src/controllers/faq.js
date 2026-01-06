const faqService = require('../services/faq.service');

module.exports = {
  async getFaqs(req, res, next) {
    try {
      const {
        faqs,
        fromCache
      } = await faqService.getAll();
      res.status(200).json({
        status: 'success',
        fromCache,
        time: `${Date.now() - req.time} ms`,
        faqs
      });
    } catch (e) {
      next(e);
    }
  },

  async addFaq(req, res, next) {
    try {
      const item = await faqService.create(req.body);
      res.status(201).json({
        status: 'success',
        item,
        time: `${Date.now() - req.time} ms`
      });
    } catch (e) {
      next(e);
    }
  },

  async updateFaq(req, res, next) {
    try {
      const item = await faqService.update(req.params.id, req.body);
      res.status(200).json({
        status: 'success',
        item,
        time: `${Date.now() - req.time} ms`
      });
    } catch (e) {
      next(e);
    }
  },

  async deleteFaq(req, res, next) {
    try {
      await faqService.remove(req.params.id);
      res.status(204).json({
        status: 'success'
      });
    } catch (e) {
      next(e);
    }
  }
};