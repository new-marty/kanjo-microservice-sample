-- +goose Up
-- Seed default categories mapping MoneyForward 大項目 to Kanjo categories

-- Income categories (is_income = true)
INSERT INTO kanjo.categories (id, mf_category, display_name, icon, color, is_income, sort_order) VALUES
    ('income-salary', '収入', '給与', '💰', '#16A34A', TRUE, 1),
    ('income-bonus', '収入', '賞与', '🎁', '#16A34A', TRUE, 2),
    ('income-investment', '収入', '投資収益', '📈', '#16A34A', TRUE, 3),
    ('income-other', '収入', 'その他収入', '💵', '#16A34A', TRUE, 4);

-- Expense categories (is_income = false)
INSERT INTO kanjo.categories (id, mf_category, display_name, icon, color, is_income, sort_order) VALUES
    -- Food & Dining
    ('expense-food', '食費', '食費', '🍽️', '#F97316', FALSE, 10),
    ('expense-groceries', '食費', '食料品', '🛒', '#F97316', FALSE, 11),
    ('expense-restaurant', '食費', '外食', '🍜', '#F97316', FALSE, 12),
    ('expense-cafe', '食費', 'カフェ', '☕', '#F97316', FALSE, 13),

    -- Daily Necessities
    ('expense-daily', '日用品', '日用品', '🧴', '#8B5CF6', FALSE, 20),

    -- Housing
    ('expense-housing', '住宅', '住居費', '🏠', '#06B6D4', FALSE, 30),
    ('expense-rent', '住宅', '家賃', '🔑', '#06B6D4', FALSE, 31),
    ('expense-utilities', '水道・光熱費', '光熱費', '💡', '#06B6D4', FALSE, 32),

    -- Transportation
    ('expense-transport', '交通費', '交通費', '🚃', '#3B82F6', FALSE, 40),
    ('expense-car', '自動車', '車関連', '🚗', '#3B82F6', FALSE, 41),

    -- Communication
    ('expense-communication', '通信費', '通信費', '📱', '#EC4899', FALSE, 50),

    -- Entertainment
    ('expense-entertainment', '趣味・娯楽', '趣味・娯楽', '🎮', '#F43F5E', FALSE, 60),
    ('expense-subscription', '趣味・娯楽', 'サブスクリプション', '📺', '#F43F5E', FALSE, 61),

    -- Health & Medical
    ('expense-health', '健康・医療', '医療費', '🏥', '#14B8A6', FALSE, 70),

    -- Fashion & Beauty
    ('expense-fashion', '衣服・美容', '衣服・美容', '👔', '#D946EF', FALSE, 80),

    -- Education
    ('expense-education', '教育・教養', '教育費', '📚', '#6366F1', FALSE, 90),

    -- Special Expenses
    ('expense-special', '特別な支出', '特別な支出', '⭐', '#EAB308', FALSE, 100),

    -- Insurance & Tax
    ('expense-insurance', '保険', '保険', '🛡️', '#64748B', FALSE, 110),
    ('expense-tax', '税・社会保障', '税金', '🏛️', '#64748B', FALSE, 111),

    -- Other
    ('expense-other', 'その他', 'その他', '📦', '#6B7280', FALSE, 120),
    ('expense-uncategorized', '未分類', '未分類', '❓', '#9CA3AF', FALSE, 999);

-- Transfer category (not income, not expense)
INSERT INTO kanjo.categories (id, mf_category, display_name, icon, color, is_income, sort_order) VALUES
    ('transfer', '振替', '振替', '🔄', '#94A3B8', FALSE, 200);

-- +goose Down
DELETE FROM kanjo.categories;
