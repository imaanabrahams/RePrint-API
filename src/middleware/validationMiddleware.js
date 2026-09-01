import { body, param, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Design validation rules
export const validateCreateDesign = [
  body('name').isString().trim().notEmpty().withMessage('Design name is required'),
  body('product_id').optional().isInt().withMessage('Product ID must be an integer'),
  body('material_id').optional().isInt().withMessage('Material ID must be an integer'),
  body('estimated_price').optional().isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('dimensions').optional().isObject().withMessage('Dimensions must be an object'),
  handleValidationErrors
];

export const validateUpdateDesign = [
  body('name').optional().isString().trim(),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  body('estimated_price').optional().isFloat({ min: 0 }).withMessage('Price must be positive'),
  handleValidationErrors
];

// Product validation rules
export const validateProductId = [
  param('id').isInt().withMessage('Product ID must be an integer'),
  handleValidationErrors
];
