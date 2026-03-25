import { body, param } from 'express-validator';

export const loginValidators = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 1, max: 200 }).withMessage('Password is required'),
];

export const registerValidators = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 8, max: 200 }).withMessage('Password must be at least 8 characters'),
  body('full_name').optional().isString().isLength({ max: 120 }).withMessage('full_name must be a string'),
];

export const forgotPasswordValidators = [
  body('email').isEmail().withMessage('Valid email is required'),
];

export const checkoutValidators = [
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.drug_id').isUUID().withMessage('items[].drug_id must be a UUID'),
  body('items.*.quantity').isInt({ min: 1, max: 9999 }).withMessage('items[].quantity must be an integer between 1 and 9999'),
  body('discount_amount').optional().isFloat({ min: 0 }).withMessage('discount_amount must be a non-negative number'),
  body('payment_method').isIn(['cash', 'momo', 'card']).withMessage('payment_method must be one of: cash, momo, card'),
  body('customer_name').optional().isString().isLength({ max: 120 }).withMessage('customer_name must be a string'),
];

export const paymentsInitializeValidators = [
  body('months')
    .optional()
    .custom((v) => [1, 3, 6, 12].includes(Number(v)))
    .withMessage('months must be one of: 1, 3, 6, 12'),
];

export const paymentsVerifyValidators = [
  param('reference').isString().isLength({ min: 6, max: 120 }).withMessage('reference is required'),
];

export const onboardingCompleteValidators = [
  body('pharmacy_name').isString().isLength({ min: 2, max: 160 }).withMessage('pharmacy_name is required'),
  body('tier').optional().isIn(['starter', 'growth', 'pro']).withMessage('tier must be starter, growth, or pro'),
  body('phone').optional().isString().isLength({ max: 60 }).withMessage('phone must be a string'),
  body('address').optional().isString().isLength({ max: 240 }).withMessage('address must be a string'),
];
