import concurrent.futures
import json
import re
import string
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "src" / "data" / "real-recipes.json"

WB_HEADERS = {
    "User-Agent": "NourishRecipePlatform/1.0 (https://github.com/Mustardandman/Healthy-Kitchen; contact@example.com)"
}

EXCLUDE_WORDS = {
    "cake", "cupcake", "brownie", "cookie", "biscuit", "fudge", "candy", "chocolate",
    "ice cream", "sorbet", "gelato", "frosting", "icing", "meringue", "donut", "doughnut",
    "pastry", "pie", "tart", "cheesecake", "pudding", "flan", "caramel", "toffee", "marshmallow",
    "cocktail", "martini", "mojito", "margarita", "sangria", "beer", "wine", "vodka", "rum",
    "whiskey", "bourbon", "gin", "tequila", "liqueur", "punch", "eggnog", "champagne",
    "bacon", "sausage", "hot dog", "bologna", "salami", "prosciutto", "liver", "tripe",
    "swordfish", "shark", "marlin", "king mackerel", "tilefish", "bigeye", "raw oysters",
    "tartare", "ceviche", "sashimi", "sushi", "carpaccio", "ancient roman", "dog treat",
    "playdough", "pet food", "baby food", "dye", "brine", "marinade", "seasoning mix",
    "spice blend", "garam masala", "curry powder", "salad dressing", "vinaigrette",
    "mayonnaise", "ketchup", "mustard", "gravy", "jam", "jelly", "marmalade", "syrup",
    "compote", "chutney", "pickled", "pickle", "kimchi", "sauerkraut", "bread machine",
    "sourdough starter", "fondant", "ganache", "praline", "macaron", "eclair", "churro",
    "fried chicken", "deep-fried", "deep fried", "sugar cookies", "shortbread",
}

EXCLUDE_PATTERNS = [
    r"\b(?:cake|cupcake|brownie|cookie|biscuit|fudge|candy|chocolate|ice cream|sorbet|gelato|frosting|icing|meringue|donut|doughnut|pastry|pie|tart|cheesecake|pudding|flan|caramel|toffee|marshmallow|marshmallows|shortbread|funnel cake|beignet|churro|sweet bread|buns)\b",
    r"\b(?:cocktail|martini|mojito|margarita|sangria|beer|ale|stout|vodka|rum|whiskey|bourbon|brandy|cognac|sherry|port|gin|tequila|liqueur|punch|eggnog|champagne|cider|sake|mirin|marsala|vermouth)\b",
    r"(?<!vinegar\s)\b(?:red wine|white wine|wine)\b(?!\s+vinegar)",
    r"\b(?:bacon|sausage|hot dog|hot dogs|bologna|baloney|salami|prosciutto|pepperoni|pastrami|spam|corned beef|chipped beef|dried beef|deli meat|cold cut|cold cuts|luncheon meat|pancetta|pork belly|ham|chorizo|liver|tripe|lard|shortening)\b",
    r"\b(?:swordfish|shark|marlin|king mackerel|tilefish|bigeye|raw egg|raw oyster|raw oysters|tartare|ceviche|sashimi|sushi|carpaccio|smoked salmon|lox|alfalfa sprouts|raw sprouts|unpasteurized|queso fresco|brie|camembert|roquefort|blue cheese|gorgonzola)\b",
    r"\b(?:deep[- ]fry(?:ing|ed)?|deep[- ]fat|fried chicken|fritters|wing|wings|croquetas|halwa|crisp|cobbler|heavy cream|whipping cream|condensed milk|corn syrup|powdered sugar|confectioners|cool whip|alfredo|poutine|soda pop|soft drink|club soda|cola|ancient roman|dog treat|playdough|pet food|baby food|dye|brine|marinade|seasoning mix|spice blend|garam masala|curry powder|salad dressing|vinaigrette|mayonnaise|ketchup|gravy|marmalade|compote|chutney|pickled|pickle|kimchi|sauerkraut|bread machine|sourdough starter|fondant|ganache|praline|macaron|eclair|egg wash)\b",
    r"(?<!baking )(?<!of )\bsoda\b",
]
EXCLUDE_RE = re.compile("|".join(EXCLUDE_PATTERNS), re.I)

# Map keywords in ingredient line -> canonical USDA_INGREDIENTS key (broths & seasonings FIRST!)
ING_KEYWORD_MAP = [
    ("chicken broth", "chicken_broth"),
    ("chicken stock", "chicken_broth"),
    ("beef broth", "chicken_broth"),
    ("beef stock", "chicken_broth"),
    ("vegetable broth", "chicken_broth"),
    ("vegetable stock", "chicken_broth"),
    ("broth", "chicken_broth"),
    ("stock", "chicken_broth"),
    ("black pepper", "seasoning_basic"),
    ("white pepper", "seasoning_basic"),
    ("pepper to taste", "seasoning_basic"),
    ("ground pepper", "seasoning_basic"),
    ("cayenne", "seasoning_basic"),
    ("chili powder", "seasoning_basic"),
    ("peppercorn", "seasoning_basic"),
    ("chile", "seasoning_basic"),
    ("chilli", "seasoning_basic"),
    ("chicken breast", "chicken_breast"),
    ("chicken thigh", "chicken_thigh"),
    ("chicken", "chicken_breast"),
    ("ground turkey", "ground_turkey"),
    ("turkey", "turkey_breast"),
    ("ground beef", "lean_ground_beef"),
    ("sirloin", "beef_sirloin"),
    ("steak", "beef_sirloin"),
    ("lamb", "beef_sirloin"),
    ("beef", "lean_ground_beef"),
    ("pork tenderloin", "pork_tenderloin"),
    ("pork", "pork_tenderloin"),
    ("salmon", "salmon_fillet"),
    ("cod", "cod_fillet"),
    ("haddock", "cod_fillet"),
    ("tilapia", "cod_fillet"),
    ("halibut", "cod_fillet"),
    ("fish", "cod_fillet"),
    ("shrimp", "shrimp"),
    ("prawn", "shrimp"),
    ("tuna", "canned_light_tuna"),
    ("eggplant", "eggplant"),
    ("aubergine", "eggplant"),
    ("egg white", "egg_whites"),
    ("egg", "egg_whole"),
    ("tofu", "firm_tofu"),
    ("edamame", "edamame"),
    ("greek yogurt", "greek_yogurt_plain"),
    ("yogurt", "greek_yogurt_plain"),
    ("yoghurt", "greek_yogurt_plain"),
    ("cottage cheese", "cottage_cheese"),
    ("almond milk", "unsweetened_almond_milk"),
    ("soy milk", "unsweetened_almond_milk"),
    ("oat milk", "unsweetened_almond_milk"),
    ("milk", "milk_lowfat"),
    ("cheddar", "cheddar_pasteurized"),
    ("mozzarella", "mozzarella_pasteurized"),
    ("feta", "feta_pasteurized"),
    ("parmesan", "parmesan_pasteurized"),
    ("ricotta", "ricotta_pasteurized"),
    ("cheese", "cheddar_pasteurized"),
    ("oats", "rolled_oats"),
    ("oatmeal", "rolled_oats"),
    ("quinoa", "quinoa_cooked"),
    ("brown rice", "brown_rice_cooked"),
    ("rice", "brown_rice_cooked"),
    ("farro", "farro_cooked"),
    ("barley", "farro_cooked"),
    ("tortilla", "whole_wheat_tortilla"),
    ("wrap", "whole_wheat_tortilla"),
    ("bread", "whole_wheat_bread"),
    ("toast", "whole_wheat_bread"),
    ("soba", "soba_noodles_cooked"),
    ("chickpea pasta", "chickpea_pasta_cooked"),
    ("pasta", "whole_wheat_pasta_cooked"),
    ("noodle", "whole_wheat_pasta_cooked"),
    ("spaghetti", "whole_wheat_pasta_cooked"),
    ("penne", "whole_wheat_pasta_cooked"),
    ("almond flour", "almond_flour"),
    ("flour", "whole_wheat_flour"),
    ("black bean", "black_beans"),
    ("kidney bean", "black_beans"),
    ("pinto bean", "black_beans"),
    ("chickpea", "chickpeas"),
    ("garbanzo", "chickpeas"),
    ("lentil", "lentils_cooked"),
    ("cannellini", "cannellini_beans"),
    ("white bean", "cannellini_beans"),
    ("bean", "black_beans"),
    ("hummus", "hummus"),
    ("spinach", "spinach"),
    ("kale", "kale"),
    ("broccoli", "broccoli"),
    ("bell pepper", "bell_pepper"),
    ("pepper", "bell_pepper"),
    ("tomato", "tomatoes"),
    ("cucumber", "cucumber"),
    ("zucchini", "zucchini"),
    ("courgette", "zucchini"),
    ("cauliflower", "cauliflower"),
    ("brussels sprout", "brussels_sprouts"),
    ("asparagus", "asparagus"),
    ("sweet potato", "sweet_potato"),
    ("yam", "sweet_potato"),
    ("potato", "sweet_potato"),
    ("carrot", "carrots"),
    ("celery", "celery"),
    ("green onion", "green_onions"),
    ("scallion", "green_onions"),
    ("onion", "onion"),
    ("shallot", "onion"),
    ("garlic", "garlic"),
    ("mushroom", "mushrooms"),
    ("lettuce", "romaine_lettuce"),
    ("greens", "romaine_lettuce"),
    ("arugula", "romaine_lettuce"),
    ("green bean", "green_beans"),
    ("cabbage", "cabbage"),
    ("eggplant", "eggplant"),
    ("aubergine", "eggplant"),
    ("squash", "butternut_squash"),
    ("pumpkin", "butternut_squash"),
    ("corn", "corn_kernels"),
    ("blueberr", "blueberries"),
    ("strawberr", "strawberries"),
    ("raspberr", "raspberries"),
    ("berry", "blueberries"),
    ("berries", "blueberries"),
    ("apple", "apple"),
    ("pear", "pear"),
    ("banana", "banana"),
    ("avocado", "avocado"),
    ("lemon", "lemon_juice"),
    ("lime", "lemon_juice"),
    ("sesame oil", "sesame_oil"),
    ("olive oil", "olive_oil"),
    ("oil", "olive_oil"),
    ("butter", "olive_oil"),
    ("chia", "chia_seeds"),
    ("flax", "chia_seeds"),
    ("pumpkin seed", "pumpkin_seeds"),
    ("pepita", "pumpkin_seeds"),
    ("sunflower seed", "pumpkin_seeds"),
    ("almond butter", "almond_butter"),
    ("peanut butter", "peanut_butter"),
    ("almond", "almonds"),
    ("walnut", "walnuts"),
    ("pecan", "walnuts"),
    ("cashew", "almonds"),
    ("peanut", "peanut_butter"),
    ("tahini", "tahini"),
    ("hemp", "hemp_hearts"),
    ("broth", "chicken_broth"),
    ("stock", "chicken_broth"),
    ("marinara", "marinara_sauce"),
    ("salsa", "salsa"),
    ("soy sauce", "soy_sauce_low_sodium"),
    ("tamari", "soy_sauce_low_sodium"),
    ("maple syrup", "maple_syrup"),
    ("honey", "maple_syrup"),
    ("vanilla", "vanilla_extract"),
    ("mustard", "dijon_mustard"),
    ("cocoa", "cocoa_powder"),
    ("coconut milk", "coconut_milk_light"),
    ("protein powder", "protein_powder_unflavored"),
    ("olive", "olives_kalamata"),
    ("parsley", "fresh_herbs"),
    ("cilantro", "fresh_herbs"),
    ("basil", "fresh_herbs"),
    ("dill", "fresh_herbs"),
    ("mint", "fresh_herbs"),
    ("cinnamon", "cinnamon_spices"),
    ("cumin", "cinnamon_spices"),
    ("oregano", "cinnamon_spices"),
    ("paprika", "cinnamon_spices"),
    ("ginger", "cinnamon_spices"),
    ("turmeric", "cinnamon_spices"),
    ("salt", "seasoning_basic"),
    ("black pepper", "seasoning_basic"),
    ("white pepper", "seasoning_basic"),
    ("peppercorn", "seasoning_basic"),
    ("water", "seasoning_basic"),
    ("vinegar", "seasoning_basic"),
    ("baking powder", "seasoning_basic"),
    ("baking soda", "seasoning_basic"),
]


def map_ingredient_id(text: str) -> str:
    low = text.lower()
    for kw, ing_id in ING_KEYWORD_MAP:
        if kw in low:
            return ing_id
    return "fresh_herbs" if "herb" in low else "seasoning_basic"


FRAC_MAP = {"½": 0.5, "⅓": 0.33, "⅔": 0.67, "¼": 0.25, "¾": 0.75, "⅛": 0.125}


def parse_qty_unit(measure_str: str, fallback_text: str = "") -> tuple[float, str]:
    s = (measure_str or fallback_text).strip()
    for sym, val in FRAC_MAP.items():
        s = s.replace(sym, f" {val} ")
    m = re.match(r"^\s*(\d+(?:\.\d+)?(?:\s*/\s*\d+)?)\s*([a-zA-Z]+)?", s)
    if not m:
        low = s.lower()
        if any(w in low for w in ("oil", "butter", "vinegar", "honey", "syrup", "sauce")):
            return 1.0, "tbsp"
        if any(w in low for w in ("salt", "pepper", "spice", "herb", "cinnamon", "garlic")):
            return 0.5, "tsp"
        return 1.0, "piece"
    qty = 1.0
    unit = "piece"
    if m:
        raw_num = m.group(1).strip()
        if "/" in raw_num:
            a, b = raw_num.split("/", 1)
            try:
                qty = float(a) / max(1.0, float(b))
            except Exception:
                qty = 1.0
        else:
            try:
                qty = float(raw_num)
            except Exception:
                qty = 1.0
        if m.group(2):
            u = m.group(2).lower()
            unit_norm = {
                "tablespoon": "tbsp", "tablespoons": "tbsp", "tbs": "tbsp", "tbsp": "tbsp",
                "teaspoon": "tsp", "teaspoons": "tsp", "tsp": "tsp",
                "cup": "cup", "cups": "cup", "c": "cup",
                "ounce": "oz", "ounces": "oz", "oz": "oz",
                "pound": "lb", "pounds": "lb", "lb": "lb", "lbs": "lb",
                "gram": "g", "grams": "g", "g": "g",
                "milliliter": "ml", "milliliters": "ml", "ml": "ml",
                "liter": "l", "liters": "l", "l": "l",
                "clove": "clove", "cloves": "clove",
                "slice": "slice", "slices": "slice",
                "can": "can", "cans": "can",
                "bunch": "bunch", "sprig": "sprig", "sprigs": "sprig",
                "pinch": "pinch", "dash": "dash", "handful": "handful",
            }.get(u, u)
            unit = unit_norm
    max_cap = 2000.0 if unit in ("g", "ml") else 20.0
    qty = max(0.25, min(max_cap, round(qty, 2)))
    return qty, unit


def fetch_json(url: str, headers: dict | None = None) -> dict:
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=headers or {"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get("Retry-After", "4"))
                time.sleep(wait)
            else:
                raise
        except Exception:
            time.sleep(1.0)
    return {}


def is_healthy_title(title: str) -> bool:
    low = title.lower()
    if EXCLUDE_RE.search(low):
        return False
    if re.search(r"\b(?:sauce|dressing|dipping|glaze|rub|paste)\b$", low):
        return False
    if len(low) < 4 or (":" in title and title.startswith("Cookbook:Category")):
        return False
    return True


PROC_UNSAFE_RE = re.compile(
    r"\b(?:unpasteurized|raw egg|raw eggs|runny yolk|vodka|rum|whiskey|beer|bourbon|brandy|cognac|liqueur|tequila|salami|blue cheese|deep[- ]fry(?:ing|ed)?|deep[- ]fat)\b|(?<!vinegar )\b(?:red wine|white wine|wine)\b(?! vinegar)",
    re.I,
)


def is_pregnancy_and_diabetes_friendly(title: str, ing_lines: list[str], instructions_text: str) -> bool:
    blob = " ".join([title, *ing_lines])
    if EXCLUDE_RE.search(blob):
        return False
    if PROC_UNSAFE_RE.search(instructions_text):
        return False
    # Exclude recipes centered around refined sugar
    sugar_lines = [l for l in ing_lines if re.search(r"\b(?:white sugar|granulated sugar|cane sugar|brown sugar|caster sugar|sugar)\b", l, re.I)]
    if sugar_lines:
        for sl in sugar_lines:
            qty, unit = parse_qty_unit(sl)
            if unit in ("cup", "lb") or (unit == "tbsp" and qty > 2) or (unit == "tsp" and qty > 6) or (unit == "g" and qty > 25):
                return False
    return True


def classify_meal_and_subs(title: str, raw_cat: str, ing_ids: list[str], instructions: str) -> tuple[str, str, list[str]]:
    low = f"{title} {raw_cat} {instructions[:200]}".lower()
    ings = set(ing_ids)

    # Breakfast detection (match egg/toast/oats/yogurt/smoothie dishes, excluding dinner mains like eggplant/noodles/curry)
    title_low = title.lower()
    is_bf_title = (
        raw_cat.lower() == "breakfast"
        or "breakfast" in title_low
        or (
            not any(x in title_low for x in ("eggplant", "noodle", "egg roll", "egg drop", "curry", "shawarma", "lamb", "salad", "pizza", "burger", "soup", "stew", "shrimp", "pasta", "roast", "steak", "chili"))
            and (
                re.search(r"\b(?:egg|eggs|omelet|omelette|frittata|pancake|pancakes|waffle|waffles|oatmeal|oat|oats|porridge|granola|muesli|smoothie|shakshuka|huevos|toast|quiche|strata|crepe|crepes|grits|congee|parfait|muffin|muffins|scramble|scrambled|poached|chilaquiles|migas|menemen|cilbir|tamagoyaki|syrniki|blini|dosa|idli|upma|poha|chia|yogurt|yoghurt|kefir|cornmeal|polenta|arepa|bran)\b", title_low)
                is not None
            )
        )
    )
    if is_bf_title:
        subs = []
        if any(w in low for w in ("egg", "omelet", "omelette", "frittata", "shakshuka", "huevos")) or "egg_whole" in ings:
            subs.append("Eggs and Omelets")
        if any(w in low for w in ("oat", "porridge", "granola", "muesli")) or "rolled_oats" in ings:
            subs.append("Oatmeal and Overnight Oats")
        if "yogurt" in low or "yoghurt" in low or "greek_yogurt_plain" in ings:
            subs.append("Greek Yogurt")
        if "smoothie" in low or "shake" in low:
            subs.append("Smoothies")
        if "bowl" in low:
            subs.append("Breakfast Bowls")
        if "toast" in low or "whole_wheat_bread" in ings:
            subs.append("Whole-Grain Toast")
        if "pancake" in low or "waffle" in low or "crepe" in low:
            subs.append("Pancakes and Waffles")
        if "wrap" in low or "burrito" in low or "tortilla" in low:
            subs.append("Breakfast Wraps")
        if "egg_whole" in ings or "greek_yogurt_plain" in ings or "cottage_cheese" in ings:
            subs.append("High-Protein Breakfasts")
        subs.append("Quick Breakfasts")
        return "breakfast", subs[0], list(dict.fromkeys(subs))

    # Snack detection
    if raw_cat.lower() in ("starter", "snack", "appetizer") or any(
        w in low for w in ("hummus", "dip", "guacamole", "salsa", "trail mix", "energy ball", "energy bite", "edamame", "cottage cheese", "roasted chickpea", "yogurt parfait", "apple slice", "snack", "bruschetta", "stuffed mushroom", "deviled egg", "almond", "walnut", "seed")
    ) and not any(w in low for w in ("roast", "stew", "casserole", "curry", "lasagna", "steak", "pasta", "soup", "chili", "biryani", "lamb")):
        subs = []
        if "yogurt" in low or "greek_yogurt_plain" in ings:
            subs.append("Greek Yogurt Snacks")
        if any(id_ in ings for id_ in ("apple", "pear", "blueberries", "strawberries", "raspberries", "banana")) and any(id_ in ings for id_ in ("almond_butter", "peanut_butter", "almonds", "walnuts", "greek_yogurt_plain", "cottage_cheese")):
            subs.append("Fruit and Protein")
        if any(id_ in ings for id_ in ("almonds", "walnuts", "pumpkin_seeds", "chia_seeds", "hemp_hearts")):
            subs.append("Nuts and Seeds")
        if "cottage" in low or "cottage_cheese" in ings:
            subs.append("Cottage Cheese")
        if any(w in low for w in ("hummus", "dip", "guacamole", "salsa")) or any(id_ in ings for id_ in ("carrots", "cucumber", "bell_pepper", "celery", "hummus")):
            subs.append("Vegetables and Dips")
        if any(w in low for w in ("energy", "bite", "ball", "bar", "muffin", "chickpea")):
            subs.append("Homemade Protein Snacks")
        subs.extend(["Quick Snacks", "Evening Snacks"])
        return "snack", subs[0], list(dict.fromkeys(subs))

    # Lunch detection
    if raw_cat.lower() in ("side",) or any(
        w in low for w in ("salad", "sandwich", "wrap", "panini", "burrito", "quesadilla", "soup", "chowder", "bisque", "gazpacho", "buddha bowl", "grain bowl", "quinoa bowl", "lunch", "tuna")
    ):
        subs = []
        if "chicken" in low or "chicken_breast" in ings:
            subs.append("Chicken")
        if "turkey" in low or "ground_turkey" in ings or "turkey_breast" in ings:
            subs.append("Turkey")
        if "beef" in low or "steak" in low or "lean_ground_beef" in ings:
            subs.append("Beef")
        if any(w in low for w in ("salmon", "tuna", "cod", "shrimp", "prawn", "fish", "seafood")):
            subs.append("Seafood")
        if "salad" in low:
            subs.append("Salads")
        if "wrap" in low or "burrito" in low:
            subs.append("Wraps")
        if "sandwich" in low or "panini" in low or "burger" in low:
            subs.append("Sandwiches")
        if "bowl" in low or "quinoa" in low or "farro" in low:
            subs.append("Grain Bowls")
        if "soup" in low or "chowder" in low or "bisque" in low:
            subs.append("Soups")
        if raw_cat.lower() in ("vegetarian", "vegan") or not any(id_ in ings for id_ in ("chicken_breast", "chicken_thigh", "ground_turkey", "turkey_breast", "lean_ground_beef", "beef_sirloin", "pork_tenderloin", "salmon_fillet", "cod_fillet", "shrimp", "canned_light_tuna")):
            subs.append("Vegetarian")
        subs.extend(["Meal Prep", "Quick Lunches"])
        return "lunch", subs[0], list(dict.fromkeys(subs))

    # Dinner default
    subs = []
    if "chicken" in low or "chicken_breast" in ings:
        subs.append("Chicken")
    if "beef" in low or "steak" in low or "lean_ground_beef" in ings or "beef_sirloin" in ings:
        subs.append("Beef")
    if "turkey" in low or "ground_turkey" in ings or "turkey_breast" in ings:
        subs.append("Turkey")
    if "pork" in low or "pork_tenderloin" in ings:
        subs.append("Pork")
    if any(w in low for w in ("salmon", "cod", "shrimp", "prawn", "fish", "seafood", "mackerel", "trout", "haddock")):
        subs.append("Seafood")
    if any(w in low for w in ("pasta", "spaghetti", "penne", "noodle", "lasagna", "macaroni", "soba", "ravioli", "linguine", "fettuccine")):
        subs.append("Pasta and Noodles")
    if any(w in low for w in ("rice", "risotto", "pilaf", "biryani", "paella", "quinoa", "farro")):
        subs.append("Rice and Grain Dishes")
    if "casserole" in low or "bake" in low or "gratin" in low:
        subs.append("Casseroles")
    if "sheet pan" in low or "roasted" in low or "traybake" in low:
        subs.append("Sheet Pan Meals")
    if "slow cooker" in low or "crock" in low or "brais" in low or "stew" in low:
        subs.append("Slow Cooker")
    if "air fryer" in low or "crispy" in low:
        subs.append("Air Fryer")
    if any(w in low for w in ("skillet", "one-pot", "one pot", "stew", "chili", "curry")):
        subs.append("One-Pot Meals")
    if any(w in low for w in ("mexican", "taco", "fajita", "enchilada", "chili", "quesadilla")):
        subs.append("Mexican-Inspired")
    if any(w in low for w in ("italian", "tuscan", "marinara", "parmesan", "risotto", "pasta", "bolognese")):
        subs.append("Italian-Inspired")
    if any(w in low for w in ("asian", "chinese", "japanese", "thai", "korean", "indian", "stir fry", "stir-fry", "teriyaki", "curry", "sesame", "ginger", "miso", "soba")):
        subs.append("Asian-Inspired")
    if raw_cat.lower() in ("vegetarian", "vegan") or not any(id_ in ings for id_ in ("chicken_breast", "chicken_thigh", "ground_turkey", "turkey_breast", "lean_ground_beef", "beef_sirloin", "pork_tenderloin", "salmon_fillet", "cod_fillet", "shrimp", "canned_light_tuna")):
        subs.append("Vegetarian")
        subs.append("Vegetables")
    if not subs:
        subs.append("One-Pot Meals")
    subs.append("Quick 30-Minute Meals")
    return "dinner", subs[0], list(dict.fromkeys(subs))


def fetch_themealdb_real() -> list[dict]:
    recipes = []
    for ch in string.ascii_lowercase:
        d = fetch_json(f"https://www.themealdb.com/api/json/v1/1/search.php?f={ch}")
        for m in d.get("meals") or []:
            src = (m.get("strSource") or "").strip()
            cat = (m.get("strCategory") or "").strip()
            title = (m.get("strMeal") or "").strip()
            thumb = (m.get("strMealThumb") or "").strip()
            if not src.startswith("http") or not thumb or not title:
                continue
            parsed = urllib.parse.urlparse(src)
            if parsed.path in ("", "/"):
                continue
            if cat == "Dessert" or not is_healthy_title(title):
                continue

            ings = []
            for i in range(1, 21):
                ing_name = (m.get(f"strIngredient{i}") or "").strip()
                meas = (m.get(f"strMeasure{i}") or "").strip()
                if not ing_name:
                    continue
                qty, unit = parse_qty_unit(meas)
                ings.append({
                    "ingredientId": map_ingredient_id(ing_name),
                    "displayName": f"{meas} {ing_name}".strip() if meas else ing_name,
                    "quantity": qty,
                    "unit": unit,
                })

            if len(ings) < 2:
                continue

            if not is_pregnancy_and_diabetes_friendly(
                title, [x["displayName"] for x in ings], m.get("strInstructions") or ""
            ):
                continue

            meal_cat, primary_sub, subs = classify_meal_and_subs(
                title, cat, [x["ingredientId"] for x in ings], m.get("strInstructions") or ""
            )

            raw_inst = (m.get("strInstructions") or "").strip()
            steps = []
            for part in re.split(r"\r?\n+|(?<=\.)\s+(?=[A-Z])", raw_inst):
                clean_p = re.sub(r"^(?:step\s*)?\d+[:.)\-]?\s*", "", part.strip(), flags=re.I)
                if len(clean_p) >= 8:
                    steps.append({"step": len(steps) + 1, "instruction": clean_p})

            host = parsed.netloc.replace("www.", "")
            raw_area = (m.get("strArea") or "International").strip()
            cuisine_name = "American" if raw_area.lower() in ("united states", "american", "usa") else raw_area
            recipes.append({
                "id": f"real-tmdb-{m['idMeal']}",
                "name": title,
                "description": f"{cuisine_name} {cat.lower() or 'recipe'} originally published on {host}. Ingredients and nutrition estimates reviewed for pregnancy mindfulness.",
                "mealCategory": meal_cat,
                "primarySubcategory": primary_sub,
                "subcategories": subs,
                "imageUrl": thumb,
                "cuisine": cuisine_name,
                "difficulty": "Easy" if len(ings) <= 7 else "Medium",
                "prepTimeMin": 12,
                "cookTimeMin": 20 if meal_cat in ("lunch", "dinner") else 10,
                "servings": 4 if meal_cat == "dinner" else 2,
                "ingredients": ings,
                "instructions": steps[:14],
                "instructionsLicenseMode": "licensed_display" if steps else "link_only",
                "sourceName": host,
                "sourceAttribution": f"Real recipe via TheMealDB • Original publisher: {host}",
                "sourceUrl": src,
                "licenseType": "TheMealDB + Direct Publisher Link",
            })
    return recipes


CUISINE_KEYWORDS = [
    ("Italian", r"\b(?:italian|tuscan|sicilian|roman|venetian|napoli|risotto|pasta alla|parmigiana|minestrone|cioppino|cacciatore)\b"),
    ("Mexican", r"\b(?:mexican|oaxacan|yucatan|poblano|enchilada|chilaquiles|tostada|pozole|molcajete|salsa verde|quesadilla)\b"),
    ("Thai", r"\b(?:thai|panang|kaeng|tom yum|tom kha|pad thai|som tam|laab|larb)\b"),
    ("Vietnamese", r"\b(?:vietnamese|pho|phở|banh mi|bánh mì|bun cha|goi cuon)\b"),
    ("Chinese", r"\b(?:chinese|sichuan|szechuan|cantonese|kung pao|congee|dim sum|chow mein|lo mein|egg drop|wonton|bok choy)\b"),
    ("Japanese", r"\b(?:japanese|teriyaki|miso|tamagoyaki|ramen|udon|soba|edamame|onigiri|katsu|donburi)\b"),
    ("Korean", r"\b(?:korean|bibimbap|bulgogi|japchae|kimchi|doenjang|jjigae)\b"),
    ("Indian", r"\b(?:indian|tandoori|tikka|masala|korma|dal|daal|dahl|biryani|vindaloo|saag|palak|paneer|rogan josh|sambar|idli|dosa|upma|poha|chana|rajma)\b"),
    ("Greek", r"\b(?:greek|tzatziki|souvlaki|avgolemono|spanakopita|horiatiki|fasolada|moussaka)\b"),
    ("French", r"\b(?:french|provencal|provençal|ratatouille|bouillabaisse|nicoise|niçoise|marengo|vichyssoise|potage)\b"),
    ("Spanish", r"\b(?:spanish|andalusian|catalan|gazpacho|paella|tortilla española|patatas|ajo blanco)\b"),
    ("Turkish", r"\b(?:turkish|menemen|cilbir|çılbır|ayran|borek|börek|cacik|kumpir|kisir)\b"),
    ("Middle Eastern", r"\b(?:lebanese|syrian|yemeni|iraqi|saudi|iranian|persian|egyptian|palestinian|jordanian|levantine|arab|shakshuka|falafel|tabbouleh|baba ganoush|mujadara|ful medames|fatteh|lahsa|kabsa|dolma|kibbeh|maqluba|musakhan)\b"),
    ("North African", r"\b(?:moroccan|algerian|tunisian|libyan|tajine|tagine|chorba|couscous|harira|chermoula|dajaj|harissa)\b"),
    ("African", r"\b(?:ethiopian|nigerian|kenyan|gambian|ghanaian|somali|tanzanian|senegalese|liberian|rwandan|ugandan|south african|cape malay|jollof|doro|mtori|canjeero|egusi|superkanja|ugali|sukuma|agbalumo|ibirayi)\b"),
    ("Eastern European", r"\b(?:polish|russian|ukrainian|hungarian|slovak|bulgarian|croatian|romanian|serbian|borscht|rosol|rosół|syrniki|racuszki|goulash|paprikash|kasha|varaniki|kashkaval|kotlety)\b"),
    ("German", r"\b(?:german|bavarian|austrian|swiss|spaetzle|spätzle|kaspressknödel|rouladen|kartoffelsalat)\b"),
    ("Indonesian", r"\b(?:indonesian|balinese|javanese|soto ayam|gado-gado|rendang|tempeh|nasi goreng|mie goreng)\b"),
    ("Filipino", r"\b(?:filipino|adobo|sinigang|tinola|pancit|pinakbet|laing)\b"),
    ("Latin American", r"\b(?:peruvian|venezuelan|argentine|argentinian|colombian|brazilian|chilean|cuban|puerto rican|arepa|empanada|feijoada|lomo|bolani|pebre|moqueca|sopaipilla|dobladita)\b"),
    ("British", r"\b(?:british|english|scottish|irish|welsh|hotpot|champ|colcannon|kedgeree|shepherd's pie|cottage pie)\b"),
    ("Canadian", r"\b(?:canadian|ontario|quebec|jiggs dinner)\b"),
    ("Caribbean", r"\b(?:jamaican|caribbean|haitian|trinidadian|barbadian|bajan|antiguan|barbados|cayman|jerk|pepperpot|callaloo|joumou)\b"),
    ("Nordic", r"\b(?:norwegian|swedish|danish|finnish|nordic|frikadeller|gravlax|knäckebröd)\b"),
    ("Dutch", r"\b(?:dutch|belgian|flemish|stamppot|waterzooi|hutsepot)\b"),
]

INTERNATIONAL_DISH_MARKERS = re.compile(
    r"\b(?:haft mewa|jajek|flija|chana|sabzi|khichdi|pachadi|rasam|thoran|avial|kitchari|kadhi|pulao|haleem|nihari|bhindi|aloo|baingan|matar|malai|kulfi|lassi|pakora|samosa|uttapam|appam|puttu|pitha|modak|laddoo|payasam|bobotie|brik|msemen|baghrir|harissa|zaalouk|labneh|manakish|fattoush|kousa|bamia|molokhia|fesenjan|ghormeh|zereshk|kuku|ash reshteh|tostones|maduros|mofongo|sancocho|locro|humita|causa|anticucho|caldo|estofado|guiso|puchero|gazpachuelo|salmorejo|fabada|cocido|pisto|zarzuela|escabeche|brandade|piperade|garbure|pot-au-feu|blanquette|tartiflette|clafoutis|farinata|ribollita|pappa al pomodoro|caponata|vignarola|acquacotta|stracciatella|zuppa|fagioli|peperonata|vitello|saltimbocca|ossobuco|bucatini|orecchiette|gnocchi|polenta|pierogi|golabki|bigos|zurek|solyanka|okroshka|rassolnik|shchi|pelmeni|blini|oladyi|kulebyaka|plov|lagman|manti|samsa|beshbarmak|khachapuri|lobio|khinkali|chakhokhbili|banitsa|tarator|shopska|musaka|sarma|punjene|cevapcici|djuvec|pasulj|mamaliga|mititei|ciorba|ghiveci)\b",
    re.I,
)


def detect_wikibooks_cuisine(clean_name: str, wikitext: str, in_us_cat: bool) -> str:
    cat_lines = " ".join(re.findall(r"\[\[Category:([^\]]+)\]\]", wikitext, re.I))
    search_blob = f"{clean_name} {cat_lines}".lower()

    for label, pattern in CUISINE_KEYWORDS:
        if re.search(pattern, search_blob, re.I):
            return label

    if INTERNATIONAL_DISH_MARKERS.search(clean_name):
        return "International"

    # Non-ASCII diacritics or parenthetical native/translated foreign names typical of international recipes
    if re.search(r"[^\x00-\x7F]", clean_name):
        return "International"

    if in_us_cat or re.search(
        r"\b(?:united states|american recipes|north american|southern recipes|cajun|tex-mex|new england|midwestern|californian)\b",
        cat_lines,
        re.I,
    ):
        return "American"

    if re.search(r"\([^)]+\)$", clean_name) and not re.search(r"\((?:gluten[- ]free|vegan|vegetarian|easy|quick|low[- ]carb)\)$", clean_name, re.I):
        return "International"

    return "American"


def parse_wikibooks_wikitext(
    title: str, wikitext: str, is_breakfast_cat: bool = False, in_us_cat: bool = False
) -> dict | None:
    if "#redirect" in wikitext.lower()[:40]:
        return None
    clean_name = title.replace("Cookbook:", "").strip()
    if not is_healthy_title(clean_name):
        return None

    # Extract ingredients section (stop only at top-level == Heading ==, preserving === Subheadings ===)
    ing_match = re.search(
        r"==+\s*Ingredients\s*==+(.*?)(?=\n==[^=]|\Z)", wikitext, re.S | re.I
    )
    if not ing_match:
        return None

    ing_lines_raw = [
        line.strip(" *#•-\t")
        for line in ing_match.group(1).splitlines()
        if line.strip() and (
            line.strip().startswith(("*", "#", "-", "•"))
            or re.match(r"^\d", line.strip())
        )
    ]
    if len(ing_lines_raw) < 2:
        ing_lines_raw = [
            line.strip(" *#•-\t|")
            for line in ing_match.group(1).splitlines()
            if line.strip()
            and not line.strip().startswith(("=", "{|", "|-", "|}", "!", "[[Category", "{{", "<"))
        ]
    ings = []
    for raw in ing_lines_raw[:18]:
        # Strip MediaWiki markup [[Cookbook:Foo|foo]] or {{convert|...}}
        cleaned = re.sub(r"<ref[^>]*>.*?</ref>|<[^>]+>", " ", raw)
        cleaned = re.sub(r"\[\[Cookbook:[^|\]]+\|([^\]]+)\]\]", r"\1", cleaned)
        cleaned = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", cleaned)
        cleaned = re.sub(r"\{\{convert\|([^|]+)\|([^|]+)\|[^}]+\}\}", r"\1 \2", cleaned)
        cleaned = re.sub(r"\{\{[^}]+\}\}", "", cleaned)
        cleaned = re.sub(r"'{2,3}", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if len(cleaned) < 2:
            continue
        qty, unit = parse_qty_unit(cleaned)
        ings.append({
            "ingredientId": map_ingredient_id(cleaned),
            "displayName": cleaned,
            "quantity": qty,
            "unit": unit,
        })

    if len(ings) < 2:
        return None

    # Extract procedure/directions/instructions section
    proc_match = re.search(
        r"==+\s*(?:Procedure|Directions|Instructions|Preparation|Method|Making|Cooking|Steps)\s*==+(.*?)(?=\n==[^=]|\Z)",
        wikitext,
        re.S | re.I,
    )
    steps = []
    if proc_match:
        raw_steps = [
            line.strip(" *#•\t")
            for line in proc_match.group(1).splitlines()
            if line.strip() and not line.strip().startswith(("[[Category:", "{{", "|", "!", "="))
        ]
        for s in raw_steps:
            sc = re.sub(r"<ref[^>]*>.*?</ref>|<[^>]+>", " ", s)
            sc = re.sub(r"\[\[Cookbook:[^|\]]+\|([^\]]+)\]\]", r"\1", sc)
            sc = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", sc)
            sc = re.sub(r"\{\{[^}]+\}\}", "", sc)
            sc = re.sub(r"'{2,3}", "", sc)
            sc = re.sub(r"\s+", " ", sc).strip()
            if len(sc) >= 8:
                steps.append({"step": len(steps) + 1, "instruction": sc})

    if len(steps) == 0:
        return None

    if not is_pregnancy_and_diabetes_friendly(
        clean_name,
        [x["displayName"] for x in ings],
        " ".join(s["instruction"] for s in steps),
    ):
        return None

    # Extract servings & time if available
    servings = 2
    sm = re.search(r"(?:servings|yield|serves|makes)\s*(?:=|:|of)?\s*(\d+)", wikitext, re.I)
    if sm:
        servings = max(1, min(24, int(sm.group(1))))
    # Batch pot heuristic if large multi-pound meat/rice quantities
    total_lb = sum(x["quantity"] for x in ings if x["unit"] == "lb")
    if total_lb >= 4 and servings < 6:
        servings = max(servings, int(total_lb))

    total_time = 25
    tm = re.search(r"time\s*=\s*(\d+)", wikitext, re.I)
    if tm:
        total_time = max(5, min(240, int(tm.group(1))))

    cats_text = " ".join(re.findall(r"\[\[Category:([^\]]+)\]\]", wikitext, re.I)).lower()
    raw_cat = ""
    if is_breakfast_cat or any(w in f"{clean_name.lower()} {cats_text}" for w in ("breakfast", "brunch")):
        raw_cat = "Breakfast"
    elif any(w in f"{clean_name.lower()} {cats_text}" for w in ("snack", "appetizer", "hors d'oeuvre", "finger food")):
        raw_cat = "Snack"
    elif any(w in cats_text for w in ("vegetarian", "vegan")):
        raw_cat = "Vegetarian"

    meal_cat, primary_sub, subs = classify_meal_and_subs(
        clean_name, raw_cat, [x["ingredientId"] for x in ings], " ".join(s["instruction"] for s in steps)
    )
    cuisine_name = detect_wikibooks_cuisine(clean_name, wikitext, in_us_cat)

    page_slug = urllib.parse.quote(title.replace(" ", "_"), safe=":/")
    wb_url = f"https://en.wikibooks.org/wiki/{page_slug}"

    return {
        "id": "real-wb-" + re.sub(r"[^a-z0-9]+", "-", clean_name.lower()).strip("-")[:48],
        "name": clean_name,
        "description": f"Real {cuisine_name} recipe from Wikibooks Cookbook (CC BY-SA 4.0) featuring {ings[0]['displayName']}.",
        "mealCategory": meal_cat,
        "primarySubcategory": primary_sub,
        "subcategories": subs,
        "imageUrl": "",  # Filled with verified unique food photo
        "cuisine": cuisine_name,
        "difficulty": "Easy" if total_time <= 30 and len(ings) <= 8 else "Medium",
        "prepTimeMin": max(5, round(total_time * 0.35)),
        "cookTimeMin": max(0, round(total_time * 0.65)),
        "servings": servings,
        "ingredients": ings,
        "instructions": steps[:12],
        "instructionsLicenseMode": "licensed_display",
        "sourceName": "Wikibooks Cookbook",
        "sourceAttribution": "Real recipe from Wikibooks Cookbook (CC BY-SA 4.0) • Nutrition estimated from USDA FoodData Central",
        "sourceUrl": wb_url,
        "licenseType": "CC BY-SA 4.0 (Wikibooks Cookbook)",
    }


def fetch_wikibooks_real(needed_counts: dict[str, int]) -> list[dict]:
    # Gather Category:United_States_recipes + Category:Breakfast_recipes + Category:Recipes titles
    titles = []
    bf_cat_titles = set()
    us_cat_titles = set()
    for cat_name in ("Category:United_States_recipes", "Category:Breakfast_recipes", "Category:Egg_recipes", "Category:Recipes"):
        cmcontinue = None
        for _ in range(9):
            u = f"https://en.wikibooks.org/w/api.php?action=query&list=categorymembers&cmtitle={urllib.parse.quote(cat_name)}&cmlimit=500&cmnamespace=102&format=json"
            if cmcontinue:
                u += "&cmcontinue=" + urllib.parse.quote(cmcontinue)
            d = fetch_json(u, WB_HEADERS)
            mems = d.get("query", {}).get("categorymembers", [])
            for m in mems:
                if cat_name == "Category:Breakfast_recipes":
                    bf_cat_titles.add(m["title"])
                if cat_name == "Category:United_States_recipes":
                    us_cat_titles.add(m["title"])
                if m["title"] not in titles:
                    titles.append(m["title"])
            cmcontinue = d.get("continue", {}).get("cmcontinue")
            if not cmcontinue:
                break
            time.sleep(0.8)

    # Filter healthy titles and prioritize Breakfast, American, Turkey, Snack, Lunch keywords first
    healthy_titles = [t for t in titles if is_healthy_title(t.replace("Cookbook:", ""))]

    def priority_key(t: str):
        low = t.lower()
        if t in bf_cat_titles or t in us_cat_titles or any(w in low for w in ("omelet", "omelette", "oat", "porridge", "yogurt", "smoothie", "pancake", "waffle", "toast", "frittata", "breakfast", "egg", "muesli", "granola", "shakshuka", "quiche", "crepe", "parfait", "grits", "muffin", "scramble", "poached", "chia", "blini", "syrniki")):
            return (0, low)
        if any(w in low for w in ("chicken", "turkey", "salmon", "hummus", "dip", "guacamole", "nut", "almond", "walnut", "seed", "apple", "pear", "berry", "edamame", "cheese", "snack", "salsa")):
            return (1, low)
        if any(w in low for w in ("salad", "soup", "sandwich", "wrap", "burrito", "bowl", "lentil", "chickpea", "quinoa")):
            return (2, low)
        return (3, low)

    healthy_titles.sort(key=priority_key)

    collected = []
    seen_ids = set()
    counts = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}

    # Fetch wikitext in batches of 40 titles across the catalog
    batch_size = 40
    for i in range(0, len(healthy_titles), batch_size):
        if all(counts[k] >= needed_counts[k] for k in needed_counts):
            break
        batch = healthy_titles[i : i + batch_size]
        titles_param = urllib.parse.quote("|".join(batch))
        u = f"https://en.wikibooks.org/w/api.php?action=query&titles={titles_param}&prop=revisions&rvprop=content&rvslots=main&format=json"
        try:
            d = fetch_json(u, WB_HEADERS)
            pages = d.get("query", {}).get("pages", {})
            for p in pages.values():
                revs = p.get("revisions") or []
                if not revs:
                    continue
                wt = revs[0].get("slots", {}).get("main", {}).get("*", "")
                parsed = parse_wikibooks_wikitext(
                    p["title"], wt, p["title"] in bf_cat_titles, p["title"] in us_cat_titles
                )
                if not parsed or parsed["id"] in seen_ids:
                    continue
                cat = parsed["mealCategory"]
                if counts[cat] >= needed_counts[cat] + 25:
                    continue
                seen_ids.add(parsed["id"])
                counts[cat] += 1
                collected.append(parsed)
        except Exception as e:
            print("Batch err:", e)
        time.sleep(0.85)
        if i % 200 == 0:
            print(f"Processed {i} Wikibooks candidates -> counts: {counts}")

    return collected


DISH_FORM_WORDS = {
    "soup", "stew", "chowder", "bisque", "chili", "curry", "salad", "sandwich",
    "wrap", "wraps", "panini", "burger", "pancake", "pancakes", "waffle", "waffles",
    "omelet", "omelette", "frittata", "quiche", "muffin", "muffins", "smoothie",
    "shake", "lassi", "oatmeal", "porridge", "granola", "muesli", "casserole",
    "pasta", "spaghetti", "noodle", "noodles", "risotto", "pilaf", "roast",
    "meatloaf", "bread", "biscuit", "biscuits", "toast", "hummus", "guacamole",
    "salsa", "dip", "crepe", "crepes", "bowl", "taco", "tacos", "enchilada",
    "fajita", "parmesan", "grits", "shakshuka", "strata", "hash", "scrambled",
    "poached", "fried", "baked", "grilled", "roasted", "stuffed", "steak",
}

PREPARED_FOOD_WORDS = DISH_FORM_WORDS | {
    "dish", "meal", "plate", "cooked", "boiled", "simmered", "sauteed", "steamed",
    "broth", "potage", "puree", "fillet", "breast", "chop", "cutlet", "skillet",
    "dinner", "lunch", "breakfast", "snack", "serving", "served", "homemade",
}

BAD_IMG_RE = re.compile(
    r"(?:logo|icon|map|diagram|svg|chart|flag|coat_of_arms|emblem|seal|menu|"
    r"magazine|cookbook|newspaper|illustration|drawing|sketch|painting|poster|"
    r"advert|book|page|scan|stouffer|microwave|frozen|packaging|package|label|"
    r"supermarket|grocery|stall|market|restaurant|interior|building|exterior|"
    r"kitchen|person|portrait|chef|woman|man|child|sign|street|cutting[_ ]board|"
    r"chopping[_ ]board|raw_|uncooked|plant|flower|bush|tree|garden|harvest|"
    r"field|farm|seedling|botanical|wikipedia|wikidata|screenshot|18\d\d|19[0-6]\d)",
    re.I,
)

UNWANTED_PHOTO_PROTEINS_RE = re.compile(
    r"\b(?:bacon|ham|salami|prosciutto|pepperoni|hotdog|cake|cupcake|donut|doughnut|cookie|ice_cream|candy)\b",
    re.I,
)


def _clean_recipe_title_for_image(name: str) -> tuple[str, str]:
    base = re.sub(r"\s+\b(?:I|II|III|IV|V)\b$", "", name.strip())
    paren_match = re.search(r"\(([^)]+)\)", base)
    paren_text = paren_match.group(1).strip() if paren_match else ""
    no_paren = re.sub(r"\s*\([^)]+\)\s*", " ", base).strip()
    no_paren = re.sub(r"\s+recipe$", "", no_paren, flags=re.I).strip()
    return no_paren, paren_text


def _build_dish_image_queries(recipe: dict) -> list[str]:
    name = recipe["name"]
    no_paren, paren_text = _clean_recipe_title_for_image(name)
    queries = []

    def add_q(q: str):
        q = re.sub(r"[^a-zA-Z0-9\s\-']", " ", q).strip()
        q = re.sub(r"\s+", " ", q)
        if len(q) >= 3 and q not in queries:
            queries.append(q)

    add_q(no_paren)
    if paren_text and not re.search(r"gluten|vegan|vegetarian|easy|quick", paren_text, re.I):
        add_q(paren_text)

    # Extract core 2-word dish phrase (e.g., "Tomato Soup", "Chicken Salad", "Oat Muffins")
    words = [w.lower() for w in re.findall(r"[a-zA-Z]+", no_paren) if len(w) >= 3]
    stop = {"with", "and", "the", "for", "easy", "basic", "simple", "quick", "style", "homemade", "best", "style"}
    sig = [w for w in words if w not in stop]
    for idx, w in enumerate(sig):
        if w in DISH_FORM_WORDS:
            if idx > 0:
                add_q(f"{sig[idx - 1]} {w}")
            if idx + 1 < len(sig):
                add_q(f"{w} {sig[idx + 1]}")
            add_q(w)
            break
    if len(sig) >= 2:
        add_q(f"{sig[0]} {sig[-1]}")
        add_q(f"{sig[-2]} {sig[-1]}")

    # Broad fallback aligned with meal category & subcategory
    sub = recipe.get("primarySubcategory", "")
    if sub:
        add_q(sub)
    cat = recipe.get("mealCategory", "dinner")
    cat_fallback = {
        "breakfast": "healthy breakfast dish",
        "lunch": "healthy lunch plate",
        "dinner": "healthy dinner meal",
        "snack": "healthy snack bowl",
    }.get(cat, "healthy food dish")
    add_q(cat_fallback)
    return queries


def _score_commons_candidate(
    file_title: str,
    info: dict,
    recipe_name: str,
    require_form_match: bool = True,
) -> int:
    mime = info.get("mime", "")
    width = info.get("width", 0) or 0
    height = info.get("height", 0) or 0
    if mime not in ("image/jpeg", "image/png", "image/webp") or width < 400 or height < 240:
        return -1

    fname_clean = file_title.replace("File:", "").lower()
    if BAD_IMG_RE.search(fname_clean):
        return -1

    rec_low = recipe_name.lower()
    # Prevent bacon/cake photos appearing on unrelated healthy recipes
    for bad_m in UNWANTED_PHOTO_PROTEINS_RE.findall(fname_clean):
        if bad_m not in rec_low:
            return -1

    stop = {"with", "and", "the", "for", "easy", "basic", "simple", "quick", "jpg", "jpeg", "png", "webp", "img", "dsc", "px"}
    title_words = {
        w for w in re.findall(r"[a-z]{3,}", rec_low)
        if w not in stop and w not in {"recipe", "homemade", "style"}
    }
    fname_words = set(re.findall(r"[a-z]{3,}", fname_clean))

    # Normalize simple plurals for clean overlap
    def stem_set(ws: set[str]) -> set[str]:
        out = set(ws)
        for w in ws:
            if w.endswith("es") and len(w) > 4:
                out.add(w[:-2])
            elif w.endswith("s") and len(w) > 3:
                out.add(w[:-1])
        return out

    t_stems = stem_set(title_words)
    f_stems = stem_set(fname_words)
    overlap = t_stems & f_stems

    form_in_title = t_stems & DISH_FORM_WORDS
    has_prepared = bool(f_stems & PREPARED_FOOD_WORDS)

    if require_form_match:
        if not overlap:
            return -1
        if form_in_title and not (form_in_title & f_stems) and not has_prepared:
            return -1

    score = len(overlap) * 35
    score += len(form_in_title & f_stems) * 45
    if has_prepared:
        score += 20
    if width >= 700:
        score += 10
    if width > height:
        score += 5  # Landscape food photo fits 4:3 cards nicely
    return score


def assign_dish_matched_images(all_real: list[dict]) -> None:
    wb_recipes = [r for r in all_real if r["id"].startswith("real-wb-")]
    if not wb_recipes:
        return

    for r in wb_recipes:
        r["imageUrl"] = ""

    used_imgs = {r["imageUrl"] for r in all_real if r.get("imageUrl")}

    # Step 1: Try Wikibooks lead pageimage in batches of 40
    print(f"Checking Wikibooks lead photos for {len(wb_recipes)} recipes...")
    title_to_recipe = {}
    for r in wb_recipes:
        slug = urllib.parse.unquote(r["sourceUrl"].split("/wiki/")[-1]).replace("_", " ")
        title_to_recipe[slug] = r

    wb_titles = list(title_to_recipe.keys())
    for i in range(0, len(wb_titles), 40):
        batch = wb_titles[i : i + 40]
        u = (
            "https://en.wikibooks.org/w/api.php?action=query&titles="
            + urllib.parse.quote("|".join(batch))
            + "&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json"
        )
        try:
            d = fetch_json(u, WB_HEADERS)
            for p in d.get("query", {}).get("pages", {}).values():
                thumb = p.get("thumbnail", {}).get("source")
                rec = title_to_recipe.get(p.get("title", ""))
                if not rec or not thumb or thumb in used_imgs:
                    continue
                fname = urllib.parse.unquote(thumb.split("/")[-1]).lower()
                if not BAD_IMG_RE.search(fname):
                    rec["imageUrl"] = thumb
                    used_imgs.add(thumb)
        except Exception:
            pass
        time.sleep(0.25)

    need_commons = [r for r in wb_recipes if not r["imageUrl"]]
    print(f"Searching per-dish Wikimedia Commons photos for {len(need_commons)} remaining recipes...")

    commons_cache: dict[str, list[tuple[str, dict, str]]] = {}

    def search_commons(q: str) -> list[tuple[str, dict, str]]:
        if q in commons_cache:
            return commons_cache[q]
        q_enc = urllib.parse.quote(f"filetype:bitmap {q}")
        u = (
            f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
            f"&gsrnamespace=6&gsrsearch={q_enc}&gsrlimit=12"
            f"&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=800&format=json"
        )
        hits = []
        try:
            d = fetch_json(u, WB_HEADERS)
            for p in d.get("query", {}).get("pages", {}).values():
                info = (p.get("imageinfo") or [{}])[0]
                iu = info.get("thumburl") or info.get("url")
                if iu:
                    hits.append((p.get("title", ""), info, iu))
        except Exception:
            pass
        commons_cache[q] = hits
        time.sleep(0.15)
        return hits

    # Precompute unique queries across remaining recipes
    recipe_queries = {r["id"]: _build_dish_image_queries(r) for r in need_commons}
    # Fetch top 2 specific queries first concurrently so cache is warm
    primary_qs = []
    seen_q = set()
    for r in need_commons:
        for q in recipe_queries[r["id"]][:2]:
            if q not in seen_q:
                seen_q.add(q)
                primary_qs.append(q)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(search_commons, primary_qs))

    matched_exact = 0
    for idx, r in enumerate(need_commons):
        qs = recipe_queries[r["id"]]
        best_url = ""
        best_score = -1

        # Pass 1: Strict dish + form match
        for q in qs[:-1]:
            hits = search_commons(q)
            for ftitle, info, iu in hits:
                if iu in used_imgs:
                    continue
                sc = _score_commons_candidate(ftitle, info, r["name"], require_form_match=True)
                if sc > best_score:
                    best_score = sc
                    best_url = iu
            if best_score >= 55:
                break

        # Pass 2: Relaxed prepared-food / category match if exact match had no unused hit
        if not best_url:
            for q in qs:
                hits = search_commons(q)
                for ftitle, info, iu in hits:
                    if iu in used_imgs:
                        continue
                    sc = _score_commons_candidate(ftitle, info, r["name"], require_form_match=False)
                    if sc > best_score:
                        best_score = sc
                        best_url = iu
                if best_url:
                    break

        if best_url:
            r["imageUrl"] = best_url
            used_imgs.add(best_url)
            if best_score >= 35:
                matched_exact += 1
        else:
            r["imageUrl"] = f"/images/food/grain-bowl.jpg?v={idx}"

    print(f"Dish-matched Commons photos complete: {matched_exact}/{len(need_commons)} strong dish-title matches.")


def main():
    import sys

    if "--images-only" in sys.argv:
        all_real = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        print(f"Redoing dish-matched images across {len(all_real)} existing real recipes...")
        assign_dish_matched_images(all_real)
        OUT_PATH.write_text(json.dumps(all_real, indent=2), encoding="utf-8")
        print("Saved updated dish-matched images to", OUT_PATH)
        return

    print("1. Fetching real TheMealDB recipes with direct strSource URLs...")
    tmdb = fetch_themealdb_real()
    tmdb_counts = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    for r in tmdb:
        tmdb_counts[r["mealCategory"]] += 1
    print("TheMealDB real counts:", len(tmdb), tmdb_counts)

    needed = {
        "breakfast": max(0, 240 - tmdb_counts["breakfast"]),
        "lunch": max(60, 250 - tmdb_counts["lunch"]),
        "dinner": max(80, 275 - tmdb_counts["dinner"]),
        "snack": max(0, 125 - tmdb_counts["snack"]),
    }
    print("2. Fetching Wikibooks Cookbook (CC BY-SA 4.0) to fill:", needed)
    wb = fetch_wikibooks_real(needed)
    wb_counts = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    for r in wb:
        wb_counts[r["mealCategory"]] += 1
    print("Wikibooks real counts:", len(wb), wb_counts)

    # Deduplicate by sourceUrl so every single recipe points to a unique recipe page
    seen_srcs = set()
    all_real = []
    for r in tmdb + wb:
        if r["sourceUrl"] in seen_srcs:
            continue
        seen_srcs.add(r["sourceUrl"])
        all_real.append(r)

    assign_dish_matched_images(all_real)

    final_counts = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    for r in all_real:
        final_counts[r["mealCategory"]] += 1

    print("FINAL REAL RECIPES:", len(all_real), final_counts)
    OUT_PATH.write_text(json.dumps(all_real, indent=2), encoding="utf-8")
    print("Saved to", OUT_PATH)


if __name__ == "__main__":
    main()

