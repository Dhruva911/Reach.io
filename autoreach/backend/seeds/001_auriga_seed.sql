-- AutoReach Seed Data
-- Auriga-specific: Cosmetic brands, nutraceutical companies, D2C founders
-- Run: psql -d autoreach -f seeds/001_auriga_seed.sql

-- ============================================
-- TENANT: Auriga Research
-- ============================================
INSERT INTO tenants (id, name, slug, plan, max_prospects_per_month, max_campaigns, max_users, channels_enabled, settings) VALUES
('a1000000-0000-0000-0000-000000000001', 'Auriga Research Pvt Ltd', 'auriga', 'enterprise', 50000, 100, 50, 
 ARRAY['email', 'linkedin', 'whatsapp'],
 '{"company_name": "Auriga Research Private Limited", "company_domain": "aurigaresearch.com", "industry": "CDMO / Contract Testing", "hq": "New Delhi, India", "tagline": "Helping You Build A Trusted Brand", "credentials": "40+ years, 1700+ professionals, 5 labs, WHO-GMP, NABL, FDA registered"}'
);

-- ============================================
-- USERS
-- ============================================
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role) VALUES
('u1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'saurabh@aurigaresearch.com', '$2b$10$placeholder_hash_replace_me', 'Saurabh', 'Arora', 'admin'),
('u1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'sales@aurigaresearch.com', '$2b$10$placeholder_hash_replace_me', 'Sales', 'Team', 'manager'),
('u1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'bd@aurigaresearch.com', '$2b$10$placeholder_hash_replace_me', 'BD', 'Team', 'rep');

-- ============================================
-- ICP TEMPLATES
-- ============================================
INSERT INTO icp_templates (id, tenant_id, name, description, filters, is_default, created_by) VALUES
('icp10000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 
 'D2C Beauty Brand Founders', 
 'Founders and co-founders of D2C skincare, haircare, and beauty brands in India looking for contract manufacturing',
 '{
    "industries": ["cosmetics", "skincare", "haircare", "beauty", "personal_care"],
    "company_size_min": 5,
    "company_size_max": 200,
    "job_titles": ["Founder", "Co-Founder", "CEO", "Managing Director"],
    "seniority": ["c_suite"],
    "geographies": ["India", "UAE", "Southeast Asia"],
    "signals": ["recently_funded", "new_product", "hiring"],
    "exclusions": {"domains": ["aurigaresearch.com", "arbropharma.com"]}
  }',
 true, 'u1000000-0000-0000-0000-000000000001'),

('icp10000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
 'Nutraceutical R&D Heads',
 'VP/Director of R&D at nutraceutical and supplement companies needing formulation + testing services',
 '{
    "industries": ["nutraceuticals", "supplements", "health_wellness", "ayurveda"],
    "company_size_min": 20,
    "company_size_max": 1000,
    "job_titles": ["VP of R&D", "Head of Product Development", "Director of Quality", "Chief Scientific Officer", "R&D Manager"],
    "seniority": ["vp", "director", "c_suite"],
    "geographies": ["India", "USA", "UK", "Germany", "Australia"],
    "signals": ["new_product", "expansion", "regulatory_change"]
  }',
 false, 'u1000000-0000-0000-0000-000000000001'),

('icp10000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001',
 'Quality Managers - Cosmetic Brands',
 'Quality and regulatory professionals at mid-large cosmetic companies needing testing and compliance services',
 '{
    "industries": ["cosmetics", "personal_care", "FMCG"],
    "company_size_min": 100,
    "company_size_max": 10000,
    "job_titles": ["Quality Manager", "Quality Head", "Regulatory Affairs Manager", "Compliance Director", "VP Quality"],
    "seniority": ["manager", "director", "vp"],
    "geographies": ["India", "Middle East", "Africa", "Southeast Asia"],
    "signals": ["regulatory_change", "product_recall", "expansion"]
  }',
 false, 'u1000000-0000-0000-0000-000000000001');

-- ============================================
-- PROSPECTS (50 Auriga-relevant prospects)
-- ============================================
INSERT INTO prospects (id, tenant_id, first_name, last_name, email, phone, linkedin_url, company_name, company_domain, title, seniority, department, industry, company_size, company_revenue, company_location, lead_score, status, source, enrichment_data, tags) VALUES

-- D2C Beauty Founders
('p1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
 'Vineeta', 'Singh', 'vineeta@sugarcosmetics.com', '+919876543210', 'https://linkedin.com/in/vineetasingh',
 'SUGAR Cosmetics', 'sugarcosmetics.com', 'Co-Founder & CEO', 'c_suite', 'Executive', 'Cosmetics', '500-1000', '$50M-100M', 'Mumbai, India',
 85, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Excited to announce SUGAR is expanding into skincare! Our R&D team is working on 15 new SKUs for 2026."], "company_news": ["SUGAR Cosmetics raises $50M Series D, plans skincare expansion"], "funding_info": {"round": "Series D", "amount": "$50M", "date": "2025"}, "prospect_brief": "SUGAR is Indias fastest-growing color cosmetics brand, now expanding into skincare. They need a CDMO partner for formulation and manufacturing of their new skincare line."}',
 ARRAY['d2c', 'funded', 'skincare_expansion', 'high_priority']),

('p1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
 'Ghazal', 'Alagh', 'ghazal@mamaearthworld.com', '+919876543211', 'https://linkedin.com/in/ghazalalagh',
 'Honasa Consumer (Mamaearth)', 'mamaearth.in', 'Co-Founder', 'c_suite', 'Executive', 'Personal Care', '1000-5000', '$200M+', 'Gurugram, India',
 78, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Our commitment to toxin-free products starts with rigorous testing. Quality is non-negotiable."], "company_news": ["Honasa Consumer exploring new product lines in baby care and mens grooming"], "prospect_brief": "Mamaearth parent company is rapidly expanding product portfolio. Their focus on natural, tested ingredients aligns perfectly with Aurigas testing and claim substantiation services."}',
 ARRAY['d2c', 'listed_company', 'natural_products']),

('p1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001',
 'Varun', 'Alagh', 'varun@mamaearthworld.com', '+919876543212', 'https://linkedin.com/in/varunalagh',
 'Honasa Consumer (Mamaearth)', 'mamaearth.in', 'Co-Founder & CEO', 'c_suite', 'Executive', 'Personal Care', '1000-5000', '$200M+', 'Gurugram, India',
 75, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Building a house of brands requires strong manufacturing partnerships"], "prospect_brief": "Key decision maker at Honasa. Oversees brand strategy and operations including manufacturing partnerships."}',
 ARRAY['d2c', 'listed_company', 'ceo']),

('p1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001',
 'Shankar', 'Prasad', 'shankar@plumgoodness.com', '+919876543213', 'https://linkedin.com/in/shankarprasad',
 'Plum Goodness', 'plumgoodness.com', 'Founder & CEO', 'c_suite', 'Executive', 'Skincare', '200-500', '$20M-50M', 'Mumbai, India',
 82, 'new', 'apollo',
 '{"recent_linkedin_posts": ["100% vegan and cruelty-free is not just a label for us — its our manufacturing standard"], "company_news": ["Plum raises $35M to scale clean beauty portfolio"], "funding_info": {"round": "Series C", "amount": "$35M"}, "prospect_brief": "Plum is a fast-growing vegan beauty brand needing certified manufacturing partners. Their clean beauty positioning requires rigorous testing and claim substantiation — Aurigas core strength."}',
 ARRAY['d2c', 'funded', 'clean_beauty', 'vegan']),

('p1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001',
 'Diipa', 'Buller-Khosla', 'diipa@indewild.com', '+919876543214', 'https://linkedin.com/in/diipakhosla',
 'Inde Wild', 'indewild.com', 'Founder', 'c_suite', 'Executive', 'Skincare', '10-50', '$1M-5M', 'Mumbai, India',
 70, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Bringing Ayurvedic beauty to a global audience — thats the Inde Wild mission"], "prospect_brief": "Ayurvedic-modern skincare brand with global ambitions. Startup stage — perfect for Aurigas low MOQ contract manufacturing."}',
 ARRAY['d2c', 'startup', 'ayurveda', 'global']),

('p1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001',
 'Rahul', 'Yadav', 'rahul@juicychemistry.com', '+919876543215', 'https://linkedin.com/in/rahulyadavjc',
 'Juicy Chemistry', 'juicychemistry.com', 'Co-Founder & CEO', 'c_suite', 'Executive', 'Skincare', '50-200', '$5M-20M', 'Coimbatore, India',
 76, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Organic certification is the future. Every product we make is COSMOS certified."], "company_news": ["Juicy Chemistry expanding to UAE and UK markets"], "prospect_brief": "Organic skincare brand with strict ingredient standards. Need for certified testing lab partner for international expansion compliance."}',
 ARRAY['d2c', 'organic', 'international_expansion']),

('p1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001',
 'Karishma', 'Kewalramani', 'karishma@skinkraft.com', '+919876543216', 'https://linkedin.com/in/karishmaskincraft',
 'SkinKraft', 'skinkraft.com', 'Co-Founder', 'c_suite', 'Executive', 'Skincare', '100-500', '$10M-30M', 'Hyderabad, India',
 73, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Personalized skincare at scale requires serious manufacturing innovation"], "prospect_brief": "Customized skincare brand producing thousands of unique formulations. Complex manufacturing needs align with Aurigas flexible production capabilities."}',
 ARRAY['d2c', 'personalized', 'scale']),

-- Nutraceutical Companies
('p1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001',
 'Revant', 'Himatsingka', 'revant@oziva.in', '+919876543217', 'https://linkedin.com/in/revanthimatsingka',
 'OZiva', 'oziva.in', 'Founder & CEO', 'c_suite', 'Executive', 'Nutraceuticals', '200-500', '$20M-50M', 'Mumbai, India',
 80, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Plant-based nutrition is not a trend — its the future of health"], "company_news": ["OZiva launches 20 new supplement SKUs targeting womens health"], "prospect_brief": "Leading plant-based nutraceutical brand in India. Rapid SKU expansion needs reliable CDMO partner for formulation, testing, and manufacturing."}',
 ARRAY['nutraceutical', 'plant_based', 'high_priority']),

('p1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001',
 'Ankur', 'Goyal', 'ankur@fitspire.in', '+919876543218', 'https://linkedin.com/in/ankurgoyal',
 'Fitspire', 'fitspire.in', 'Founder & CEO', 'c_suite', 'Executive', 'Sports Nutrition', '50-200', '$5M-15M', 'New Delhi, India',
 68, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Quality testing is the backbone of sports nutrition. No shortcuts."], "prospect_brief": "Sports nutrition brand focused on clean, tested supplements. Strong alignment with Aurigas testing and quality certification services."}',
 ARRAY['nutraceutical', 'sports_nutrition', 'delhi_based']),

('p1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001',
 'Tarun', 'Sharma', 'tarun@kapiva.com', '+919876543219', 'https://linkedin.com/in/tarunsharmakapiva',
 'Kapiva', 'kapiva.com', 'Founder & CEO', 'c_suite', 'Executive', 'Ayurveda / Nutraceuticals', '200-500', '$20M-40M', 'Mumbai, India',
 77, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Modern Ayurveda needs modern science to back it up. Claim substantiation is key."], "company_news": ["Kapiva raises $25M to scale Ayurvedic juice and supplement line"], "prospect_brief": "Ayurvedic nutraceutical brand merging tradition with science. Their focus on clinical validation aligns perfectly with Aurigas clinical division for claim substantiation."}',
 ARRAY['nutraceutical', 'ayurveda', 'funded', 'claim_substantiation']),

-- R&D and Quality Heads
('p1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001',
 'Dr. Meera', 'Rajput', 'meera.rajput@himalayawellness.com', '+919876543220', 'https://linkedin.com/in/drmeera',
 'Himalaya Wellness', 'himalayawellness.com', 'VP of R&D', 'vp', 'R&D', 'Herbal / Personal Care', '5000+', '$500M+', 'Bangalore, India',
 65, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Our R&D pipeline has 30+ products in development for 2026-27"], "prospect_brief": "Large herbal wellness company with massive R&D pipeline. May need external testing capacity for their new product development initiatives."}',
 ARRAY['enterprise', 'herbal', 'rd_pipeline']),

('p1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000001',
 'Amit', 'Jain', 'amit.jain@emami.com', '+919876543221', 'https://linkedin.com/in/amitjainemami',
 'Emami Limited', 'emamiltd.in', 'Head of Quality Assurance', 'director', 'Quality', 'FMCG / Personal Care', '5000+', '$700M+', 'Kolkata, India',
 60, 'new', 'apollo',
 '{"prospect_brief": "Emami is a major FMCG player with extensive personal care and healthcare product lines. External testing and quality validation services could support their product expansion."}',
 ARRAY['enterprise', 'fmcg', 'quality']),

('p1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000001',
 'Priya', 'Nair', 'priya.nair@loreal.com', '+919876543222', 'https://linkedin.com/in/priyanairloreal',
 'L''Oreal India', 'loreal.co.in', 'Director of Regulatory Affairs', 'director', 'Regulatory', 'Cosmetics', '5000+', '$1B+', 'Mumbai, India',
 55, 'new', 'apollo',
 '{"prospect_brief": "L''Oreal India regulatory head. MNCs often outsource safety testing and claim substantiation to independent labs. Aurigas NABL accreditation and FDA registration make it a credible partner."}',
 ARRAY['mnc', 'cosmetics', 'regulatory']),

-- International D2C / Wellness Brands
('p1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000001',
 'Arjun', 'Vaidya', 'arjun@drtrust.in', '+919876543223', 'https://linkedin.com/in/arjunvaidya',
 'Dr Trust', 'drtrust.in', 'Co-Founder', 'c_suite', 'Executive', 'Health Devices / Supplements', '100-500', '$20M-50M', 'New Delhi, India',
 72, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Expanding our supplements line — 10 new products coming Q2 2026"], "prospect_brief": "Healthcare brand moving aggressively into supplements. Need for formulation and manufacturing support aligns with Aurigas CDMO capabilities."}',
 ARRAY['healthcare', 'supplements', 'delhi_based']),

('p1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000001',
 'Falguni', 'Nayar', 'falguni@nykaa.com', '+919876543224', 'https://linkedin.com/in/falguninayar',
 'Nykaa', 'nykaa.com', 'Founder & CEO', 'c_suite', 'Executive', 'Beauty / E-commerce', '5000+', '$500M+', 'Mumbai, India',
 70, 'new', 'apollo',
 '{"company_news": ["Nykaa expanding private label cosmetics line with 50+ new SKUs"], "prospect_brief": "Nykaa''s private label expansion creates massive demand for contract manufacturing. Aurigas high-capacity production and low MOQ are key differentiators."}',
 ARRAY['enterprise', 'private_label', 'ecommerce', 'high_priority']),

('p1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000001',
 'Mohit', 'Aron', 'mohit@beardo.in', '+919876543225', 'https://linkedin.com/in/mohitaron',
 'Beardo (Marico)', 'beardo.in', 'Head of Product Development', 'director', 'Product', 'Mens Grooming', '100-500', '$15M-30M', 'Ahmedabad, India',
 74, 'new', 'apollo',
 '{"recent_linkedin_posts": ["Men''s grooming in India is a $1B opportunity. We are just getting started."], "prospect_brief": "Beardo is scaling mens grooming products under Marico. Product development head is the key contact for manufacturing partnerships."}',
 ARRAY['d2c', 'mens_grooming', 'marico']),

('p1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000001',
 'Rashmi', 'Kwatra', 'rashmi@justherbs.in', '+919876543226', 'https://linkedin.com/in/rashmikwatra',
 'Just Herbs', 'justherbs.in', 'Founder', 'c_suite', 'Executive', 'Ayurvedic Beauty', '50-100', '$3M-10M', 'New Delhi, India',
 69, 'new', 'apollo',
 '{"prospect_brief": "Ayurvedic beauty brand that emphasizes transparency and ingredient quality. Small-to-mid scale — ideal for Aurigas flexible manufacturing and low MOQ offerings."}',
 ARRAY['d2c', 'ayurveda', 'delhi_based', 'low_moq']),

('p1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000001',
 'Vimal', 'Kumar', 'vimal@lotus-herbals.com', '+919876543227', 'https://linkedin.com/in/vimalkumarlotus',
 'Lotus Herbals', 'lotus-herbals.com', 'VP Manufacturing', 'vp', 'Operations', 'Herbal Cosmetics', '500-1000', '$80M-150M', 'New Delhi, India',
 62, 'new', 'apollo',
 '{"prospect_brief": "Established herbal cosmetics brand with strong India presence. VP Manufacturing is the decision maker for external testing and quality partnerships."}',
 ARRAY['enterprise', 'herbal', 'delhi_based']),

('p1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000001',
 'Anita', 'Bhatia', 'anita@forestessentials.com', '+919876543228', 'https://linkedin.com/in/anitabhatia',
 'Forest Essentials', 'forestessentials.com', 'Head of Quality & Compliance', 'director', 'Quality', 'Luxury Ayurveda', '200-500', '$30M-60M', 'New Delhi, India',
 67, 'new', 'apollo',
 '{"prospect_brief": "Luxury Ayurvedic brand owned by Estee Lauder. Premium positioning demands rigorous quality testing — perfect fit for Aurigas NABL-accredited labs."}',
 ARRAY['luxury', 'ayurveda', 'estee_lauder', 'quality']),

('p1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000001',
 'Nikhil', 'Chopra', 'nikhil@jovees.com', '+919876543229', 'https://linkedin.com/in/nikhilchoprajovees',
 'Jovees Herbal', 'jovees.com', 'Director of Operations', 'director', 'Operations', 'Herbal Cosmetics', '200-500', '$15M-30M', 'New Delhi, India',
 64, 'new', 'apollo',
 '{"prospect_brief": "Mid-size herbal cosmetics brand looking to scale. Operations director handles manufacturing partner decisions."}',
 ARRAY['herbal', 'delhi_based', 'mid_market']);

-- ============================================
-- SEQUENCES (Pre-built templates)
-- ============================================
INSERT INTO sequences (id, tenant_id, name, description, is_template, steps, total_steps, channels_used, created_by) VALUES

('s1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
 'Auriga Standard B2B — 10 Day',
 'Standard multi-channel outreach for Auriga CDMO/testing services. Email-first with LinkedIn and WhatsApp follow-ups.',
 true,
 '[
    {
      "step_number": 1, "day": 1, "channel": "email", "action": "send_email",
      "template": {
        "subject_template": "{{first_name}}, helping brands like {{company_name}} with end-to-end product development",
        "body_template": "Hi {{first_name}},\n\nI noticed {{personalization_hook}}.\n\nAt Auriga Research, we help {{industry}} brands go from idea to market with our CDMO services — formulation, testing (NABL-accredited), clinical studies, and GMP-certified manufacturing.\n\nWith 40+ years of expertise and 5 state-of-the-art labs across India, we have helped 12,000+ brands build trusted products.\n\nWould you be open to a 15-minute call this week to explore how we could support {{company_name}}?\n\nBest,\n{{sender_name}}\n{{sender_title}}, Auriga Research",
        "ai_personalize": true
      },
      "conditions": {"skip_if_replied": true}
    },
    {
      "step_number": 2, "day": 2, "channel": "linkedin", "action": "view_profile",
      "template": {},
      "conditions": {"skip_if_replied": true}
    },
    {
      "step_number": 3, "day": 3, "channel": "linkedin_connect", "action": "send_connection",
      "template": {
        "body_template": "Hi {{first_name}}, I lead business development at Auriga Research — we are a 40-year-old CDMO helping {{industry}} brands with formulation, testing, and manufacturing. Would love to connect!",
        "ai_personalize": true
      },
      "conditions": {"skip_if_replied": true}
    },
    {
      "step_number": 4, "day": 5, "channel": "whatsapp", "action": "send_whatsapp",
      "template": {
        "body_template": "Hi {{first_name}}, this is {{sender_name}} from Auriga Research. We specialize in helping {{industry}} brands with end-to-end product development. Would love to share how we can support {{company_name}}. Open for a quick chat?",
        "ai_personalize": false
      },
      "conditions": {"skip_if_replied": true, "require_phone": true}
    },
    {
      "step_number": 5, "day": 7, "channel": "email", "action": "send_email",
      "template": {
        "subject_template": "Re: {{first_name}}, quick follow-up",
        "body_template": "Hi {{first_name}},\n\nJust wanted to follow up on my earlier email.\n\n{{follow_up_value_add}}\n\nWe recently helped a {{similar_company_type}} brand achieve {{case_study_result}}. Happy to share the case study if useful.\n\nWould 15 minutes this week work for a quick chat?\n\nBest,\n{{sender_name}}",
        "ai_personalize": true
      },
      "conditions": {"skip_if_replied": true, "skip_if_opened": false}
    },
    {
      "step_number": 6, "day": 10, "channel": "linkedin_dm", "action": "send_linkedin_dm",
      "template": {
        "body_template": "Hi {{first_name}}, I sent you an email last week about how Auriga Research could help {{company_name}} with {{specific_service}}. Would love to connect and share more. Happy to hop on a quick call whenever works!",
        "ai_personalize": true
      },
      "conditions": {"skip_if_replied": true, "require_connected": true, "fallback_channel": "email"}
    },
    {
      "step_number": 7, "day": 14, "channel": "email", "action": "send_email",
      "template": {
        "subject_template": "Last note, {{first_name}}",
        "body_template": "Hi {{first_name}},\n\nI have reached out a couple of times and understand you are busy. I will not take more of your time.\n\nIf {{company_name}} ever needs support with formulation, product testing, clinical studies, or GMP manufacturing, Auriga Research would be glad to help.\n\nFeel free to reach out anytime: auriga@aurigaresearch.com | +91-11-45854585\n\nWishing you and {{company_name}} all the best!\n\n{{sender_name}}",
        "ai_personalize": false
      },
      "conditions": {"skip_if_replied": true}
    }
  ]',
 7, ARRAY['email', 'linkedin', 'linkedin_connect', 'linkedin_dm', 'whatsapp'], 'u1000000-0000-0000-0000-000000000001'),

('s1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
 'Funded Startup Quick Touch — 5 Day',
 'Fast-paced sequence for recently funded startups who may need CDMO services urgently.',
 true,
 '[
    {
      "step_number": 1, "day": 1, "channel": "email", "action": "send_email",
      "template": {
        "subject_template": "Congrats on the funding, {{first_name}}! Quick thought on scaling production",
        "body_template": "Hi {{first_name}},\n\nCongratulations on {{company_name}}''s recent funding round — exciting times!\n\nAs you scale, product development and manufacturing can become a bottleneck. Auriga Research (40+ years, WHO-GMP, 5 labs) helps funded {{industry}} brands go from formulation to shelf-ready products — fast, compliant, and with low MOQs.\n\nWould it be helpful to have a quick chat about how we could support your growth plans?\n\n{{sender_name}}",
        "ai_personalize": true
      },
      "conditions": {"skip_if_replied": true}
    },
    {
      "step_number": 2, "day": 2, "channel": "linkedin_connect", "action": "send_connection",
      "template": {
        "body_template": "Congrats on the funding, {{first_name}}! I run BD at Auriga Research — we help funded {{industry}} brands scale manufacturing. Would love to connect!",
        "ai_personalize": true
      },
      "conditions": {"skip_if_replied": true}
    },
    {
      "step_number": 3, "day": 3, "channel": "whatsapp", "action": "send_whatsapp",
      "template": {
        "body_template": "Hi {{first_name}}! {{sender_name}} from Auriga Research here. We help {{industry}} brands with formulation + manufacturing. Saw {{company_name}}''s recent growth — would love to chat about supporting your production needs.",
        "ai_personalize": false
      },
      "conditions": {"skip_if_replied": true, "require_phone": true}
    },
    {
      "step_number": 4, "day": 5, "channel": "email", "action": "send_email",
      "template": {
        "subject_template": "Re: Scaling {{company_name}}''s product line",
        "body_template": "Hi {{first_name}},\n\nQuick follow-up — I know post-funding is a busy time.\n\nOne thing funded brands often underestimate is the time from formulation to first production batch. We have helped brands cut this from 6 months to 8 weeks.\n\nHappy to share how — even a 10-minute call would be valuable.\n\n{{sender_name}}\nAuriga Research | auriga@aurigaresearch.com",
        "ai_personalize": true
      },
      "conditions": {"skip_if_replied": true}
    }
  ]',
 4, ARRAY['email', 'linkedin_connect', 'whatsapp'], 'u1000000-0000-0000-0000-000000000001');

-- ============================================
-- CAMPAIGNS
-- ============================================
INSERT INTO campaigns (id, tenant_id, name, description, icp_template_id, sequence_id, status, settings, total_prospects, created_by) VALUES
('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
 'D2C Beauty Founders — Q1 2026',
 'Target D2C beauty brand founders in India for CDMO partnerships',
 'icp10000-0000-0000-0000-000000000001',
 's1000000-0000-0000-0000-000000000001',
 'active',
 '{"send_timezone": "Asia/Kolkata", "send_hours_start": 9, "send_hours_end": 18, "skip_weekends": true, "daily_email_limit": 50, "daily_linkedin_limit": 20, "auto_send_cold": true, "review_warm_leads": true, "warm_threshold": 50, "hot_threshold": 80}',
 10, 'u1000000-0000-0000-0000-000000000001'),

('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
 'Funded Startups — Fast Track',
 'Quick outreach to recently funded beauty/wellness startups',
 'icp10000-0000-0000-0000-000000000001',
 's1000000-0000-0000-0000-000000000002',
 'draft',
 '{"send_timezone": "Asia/Kolkata", "send_hours_start": 10, "send_hours_end": 17, "skip_weekends": true, "daily_email_limit": 30, "daily_linkedin_limit": 15}',
 5, 'u1000000-0000-0000-0000-000000000001');

-- ============================================
-- EMAIL ACCOUNTS
-- ============================================
INSERT INTO email_accounts (id, tenant_id, email_address, display_name, provider, warmup_status, daily_send_limit) VALUES
('e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'saurabh@aurigaresearch.com', 'Dr. Saurabh Arora', 'instantly', 'warmed', 200),
('e1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'partnerships@aurigaresearch.com', 'Auriga Partnerships', 'instantly', 'warming', 50),
('e1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'solutions@aurigaresearch.com', 'Auriga Solutions', 'instantly', 'warming', 50);

-- ============================================
-- LINKEDIN ACCOUNTS
-- ============================================
INSERT INTO linkedin_accounts (id, tenant_id, linkedin_email, profile_url, display_name, daily_connect_limit, daily_view_limit) VALUES
('l1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'saurabh@aurigaresearch.com', 'https://linkedin.com/in/drsaurabharora', 'Dr. Saurabh Arora', 25, 50),
('l1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'bd@aurigaresearch.com', 'https://linkedin.com/in/aurigabd', 'Auriga Business Development', 20, 40);

-- Done! Your Auriga-specific data is ready.
-- Start the API server and begin outreach!
