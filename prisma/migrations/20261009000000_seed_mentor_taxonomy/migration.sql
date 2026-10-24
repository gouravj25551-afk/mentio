-- The first live database starts empty. These choices make the required
-- mentor-application category field usable immediately, without an operator
-- having to insert records by hand.
INSERT INTO "Category" ("id", "slug", "name", "description", "order", "createdAt") VALUES
  ('cat_career', 'career', 'Career', 'Career growth, job search, and interviews.', 10, CURRENT_TIMESTAMP),
  ('cat_technology', 'technology', 'Technology', 'Software, product, data, and AI.', 20, CURRENT_TIMESTAMP),
  ('cat_business', 'business', 'Business', 'Startups, strategy, and operations.', 30, CURRENT_TIMESTAMP),
  ('cat_design', 'design', 'Design', 'Product, visual, and UX design.', 40, CURRENT_TIMESTAMP),
  ('cat_marketing', 'marketing', 'Marketing', 'Growth, content, and brand.', 50, CURRENT_TIMESTAMP),
  ('cat_education', 'education', 'Education', 'Learning, admissions, and teaching.', 60, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Skill" ("id", "slug", "name", "createdAt") VALUES
  ('skill_interviews', 'interviews', 'Interviews', CURRENT_TIMESTAMP),
  ('skill_resume', 'resume', 'Resume review', CURRENT_TIMESTAMP),
  ('skill_product', 'product-management', 'Product management', CURRENT_TIMESTAMP),
  ('skill_software', 'software-engineering', 'Software engineering', CURRENT_TIMESTAMP),
  ('skill_design', 'ux-design', 'UX design', CURRENT_TIMESTAMP),
  ('skill_startups', 'startups', 'Startups', CURRENT_TIMESTAMP),
  ('skill_marketing', 'marketing', 'Marketing', CURRENT_TIMESTAMP),
  ('skill_leadership', 'leadership', 'Leadership', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
