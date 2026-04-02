"""Rule-based merchant name matching."""

import re
from dataclasses import dataclass

from transform.models import MerchantOutput


@dataclass
class MerchantRule:
    """A rule for matching and normalizing merchant names."""

    pattern: re.Pattern[str]
    normalized_name: str
    display_name: str | None = None
    icon: str | None = None
    confidence: int = 95


# Common merchant patterns for Japanese transactions
MERCHANT_RULES: list[MerchantRule] = [
    # E-commerce
    MerchantRule(
        re.compile(r"アマゾン|AMAZON|ｱﾏｿﾞﾝ", re.IGNORECASE),
        "Amazon",
        "Amazon",
        icon="📦",
    ),
    MerchantRule(
        re.compile(r"楽天|RAKUTEN", re.IGNORECASE),
        "Rakuten",
        "楽天",
        icon="🛒",
    ),
    # Convenience stores
    MerchantRule(
        re.compile(r"セブン.?イレブン|7.?ELEVEN|ｾﾌﾞﾝ.?ｲﾚﾌﾞﾝ", re.IGNORECASE),
        "Seven-Eleven",
        "セブンイレブン",
        icon="🏪",
    ),
    MerchantRule(
        re.compile(r"ローソン|LAWSON|ﾛｰｿﾝ", re.IGNORECASE),
        "Lawson",
        "ローソン",
        icon="🏪",
    ),
    MerchantRule(
        re.compile(r"ファミリーマート|FAMILYMART|ﾌｧﾐﾘｰﾏｰﾄ", re.IGNORECASE),
        "FamilyMart",
        "ファミリーマート",
        icon="🏪",
    ),
    # Coffee
    MerchantRule(
        re.compile(r"スターバックス|STARBUCKS|ｽﾀｰﾊﾞｯｸｽ", re.IGNORECASE),
        "Starbucks",
        "スターバックス",
        icon="☕",
    ),
    # Fast food
    MerchantRule(
        re.compile(r"マクドナルド|MCDONALD|ﾏｸﾄﾞﾅﾙﾄﾞ", re.IGNORECASE),
        "McDonalds",
        "マクドナルド",
        icon="🍔",
    ),
    MerchantRule(
        re.compile(r"すき家|SUKIYA|ｽｷﾔ", re.IGNORECASE),
        "Sukiya",
        "すき家",
        icon="🥩",
    ),
    MerchantRule(
        re.compile(r"吉野家|YOSHINOYA|ﾖｼﾉﾔ", re.IGNORECASE),
        "Yoshinoya",
        "吉野家",
        icon="🍚",
    ),
    MerchantRule(
        re.compile(r"松屋(?!銀座)", re.IGNORECASE),
        "Matsuya",
        "松屋",
        icon="🍚",
    ),
    # Retail
    MerchantRule(
        re.compile(r"ユニクロ|UNIQLO|ﾕﾆｸﾛ", re.IGNORECASE),
        "Uniqlo",
        "ユニクロ",
        icon="👕",
    ),
    MerchantRule(
        re.compile(r"無印良品|MUJI", re.IGNORECASE),
        "Muji",
        "無印良品",
        icon="🏠",
    ),
    MerchantRule(
        re.compile(r"イオン|AEON|ｲｵﾝ", re.IGNORECASE),
        "Aeon",
        "イオン",
        icon="🛒",
    ),
    MerchantRule(
        re.compile(r"ドン.?キホーテ|DONKI|ﾄﾞﾝｷ", re.IGNORECASE),
        "Don Quijote",
        "ドンキホーテ",
        icon="🎁",
    ),
    # Electronics
    MerchantRule(
        re.compile(r"ヨドバシ|YODOBASHI|ﾖﾄﾞﾊﾞｼ", re.IGNORECASE),
        "Yodobashi",
        "ヨドバシカメラ",
        icon="📷",
    ),
    MerchantRule(
        re.compile(r"ビックカメラ|BICCAMERA|ﾋﾞｯｸｶﾒﾗ", re.IGNORECASE),
        "Bic Camera",
        "ビックカメラ",
        icon="📷",
    ),
    # Subscriptions
    MerchantRule(
        re.compile(r"NETFLIX|ネットフリックス", re.IGNORECASE),
        "Netflix",
        "Netflix",
        icon="📺",
    ),
    MerchantRule(
        re.compile(r"SPOTIFY|スポティファイ", re.IGNORECASE),
        "Spotify",
        "Spotify",
        icon="🎵",
    ),
    MerchantRule(
        re.compile(r"APPLE|アップル", re.IGNORECASE),
        "Apple",
        "Apple",
        icon="🍎",
        confidence=90,
    ),
    MerchantRule(
        re.compile(r"GOOGLE|グーグル", re.IGNORECASE),
        "Google",
        "Google",
        icon="🔍",
        confidence=90,
    ),
    # Transportation
    MerchantRule(
        re.compile(r"JR|東日本旅客|西日本旅客|東海旅客", re.IGNORECASE),
        "JR",
        "JR",
        icon="🚃",
        confidence=90,
    ),
    MerchantRule(
        re.compile(r"東京メトロ|TOKYO METRO", re.IGNORECASE),
        "Tokyo Metro",
        "東京メトロ",
        icon="🚇",
    ),
    # Telecom
    MerchantRule(
        re.compile(r"NTT|ドコモ|DOCOMO", re.IGNORECASE),
        "NTT Docomo",
        "NTTドコモ",
        icon="📱",
        confidence=90,
    ),
    MerchantRule(
        re.compile(r"SOFTBANK|ソフトバンク", re.IGNORECASE),
        "SoftBank",
        "ソフトバンク",
        icon="📱",
    ),
    MerchantRule(
        re.compile(r"\bAU\b|KDDI", re.IGNORECASE),
        "au",
        "au",
        icon="📱",
        confidence=90,
    ),
]


def match_merchant_by_rules(description: str) -> MerchantOutput | None:
    """Try to match a merchant using predefined rules.

    Returns None if no rule matches.
    """
    for rule in MERCHANT_RULES:
        if rule.pattern.search(description):
            return MerchantOutput(
                normalized_name=rule.normalized_name,
                display_name=rule.display_name,
                icon=rule.icon,
                confidence=rule.confidence,
            )
    return None
