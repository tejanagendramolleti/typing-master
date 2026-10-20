-- -----------------------------------------------------------------------------
-- V7__seed_plans.sql
--
-- The pricing plans. The prices live in the database rather than in the code,
-- so they can be changed without a deployment.
--
-- The amounts are in paise: 149 rupees is 14900 paise. Money is never held as
-- a fraction anywhere in the application.
-- -----------------------------------------------------------------------------

INSERT INTO plans (code, name, description, price_paise, currency, duration_days, interval, features, active, sort_order)
VALUES
    ('FREE', 'Free',
     'Three practice tests a day, in every language.',
     0, 'INR', 0, 'FREE',
     'Three practice tests a day, counted on the server
Every language: English, Hindi and Telugu
The full result: speed, accuracy, mistakes and the word-by-word diff
Your history of tests
No card, and no trial that expires',
     TRUE, 0),

    ('PRO-MONTHLY', 'Pro Monthly',
     'Everything in Pro, paid month by month.',
     14900, 'INR', 30, 'MONTHLY',
     'Unlimited practice tests
The full-length mock series for every exam
Detailed analytics: speed and accuracy trends, weak keys, weak words
A smart drill built from the keys and words you get wrong
The best hour of your day, from your own history
A downloadable PDF report of every test
A verifiable certificate when you pass a full mock',
     TRUE, 1),

    ('PRO-QUARTERLY', 'Pro Quarterly',
     'Everything in Pro, paid for three months.',
     39900, 'INR', 90, 'QUARTERLY',
     'Everything in Pro Monthly
Three months in one payment
About 11% off the monthly price
Unlimited practice tests
The full-length mock series for every exam
Detailed analytics and smart drills
PDF reports and verifiable certificates',
     TRUE, 2),

    ('PRO-YEARLY', 'Pro Yearly',
     'Everything in Pro, paid for a year.',
     129900, 'INR', 365, 'YEARLY',
     'Everything in Pro Monthly
A year in one payment
About 27% off the monthly price
Unlimited practice tests
The full-length mock series for every exam
Detailed analytics and smart drills
PDF reports and verifiable certificates',
     TRUE, 3)
ON CONFLICT (code) DO NOTHING;
