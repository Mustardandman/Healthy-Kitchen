import concurrent.futures
import json
import re
import string
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
META_PATH = ROOT / "scripts" / "recipe-meta.json"
OUT_PATH = ROOT / "src" / "data" / "recipe-image-map.json"

BAD_TITLE_WORDS = {
    "logo", "icon", "diagram", "map", "flag", "chart", "portrait", "person",
    "building", "store", "supermarket", "restaurant", "sign", "menu", "poster",
    "drawing", "illustration", "clipart", "cartoon", "svg", "graph", "table",
    "nutrition", "label", "package", "box", "bottle", "jar", "can",
    "receipt", "book", "cover", "coat_of_arms", "wiki", "screenshot", "raw_chicken",
    "slaughter", "farm", "field", "plant_crop", "flower", "seed_packet",
    "cake", "cupcake", "donut", "doughnut", "candy", "soda", "beer", "wine",
    "cocktail", "whiskey", "pizza_box", "mcdonald", "burger_king", "statue",
    "museum", "street", "market_stall", "person_eating", "kitchen_appliance",
}

WIKIMEDIA_QUERIES = [
    ("omelet", "omelette"),
    ("omelet", "frittata"),
    ("scramble", "scrambled eggs"),
    ("oatmeal", "oatmeal"),
    ("oatmeal", "overnight oats"),
    ("oatmeal", "porridge berries"),
    ("yogurt", "yogurt parfait"),
    ("yogurt", "greek yogurt berries"),
    ("smoothie", "smoothie"),
    ("smoothie", "green smoothie"),
    ("toast", "avocado toast"),
    ("toast", "whole wheat toast"),
    ("pancake", "pancakes berries"),
    ("waffle", "waffles fruit"),
    ("wrap", "breakfast burrito"),
    ("cottage_cheese", "cottage cheese"),
    ("salad", "chicken salad"),
    ("salad", "quinoa salad"),
    ("salad", "chickpea salad"),
    ("wrap", "tortilla wrap"),
    ("sandwich", "turkey sandwich"),
    ("grain_bowl", "buddha bowl"),
    ("grain_bowl", "quinoa bowl"),
    ("soup", "lentil soup"),
    ("soup", "chicken soup"),
    ("chili", "turkey chili"),
    ("chicken", "roasted chicken"),
    ("beef", "beef stir fry"),
    ("beef", "stuffed peppers"),
    ("pork", "pork tenderloin"),
    ("salmon", "grilled salmon"),
    ("salmon", "baked salmon"),
    ("fish", "baked cod"),
    ("shrimp", "garlic shrimp"),
    ("pasta", "whole wheat pasta"),
    ("noodles", "soba noodles"),
    ("tofu", "tofu stir fry"),
    ("curry", "chickpea curry"),
    ("hummus", "hummus vegetables"),
    ("fruit_nut", "apple peanut butter"),
    ("nuts", "almonds walnuts"),
    ("edamame", "edamame"),
    ("boiled_egg", "hard boiled eggs"),
    ("chickpeas", "roasted chickpeas"),
]

OPENVERSE_QUERIES = [
    ("omelet", "spinach omelet"),
    ("oatmeal", "overnight oats blueberries"),
    ("yogurt", "greek yogurt berries"),
    ("smoothie", "berry spinach smoothie"),
    ("toast", "avocado egg toast"),
    ("pancake", "oatmeal pancakes"),
    ("hummus", "hummus carrots"),
    ("cottage_cheese", "cottage cheese berries"),
    ("grain_bowl", "quinoa chickpea bowl"),
    ("salad", "grilled chicken salad"),
    ("salmon", "baked salmon asparagus"),
    ("energy_bites", "oatmeal energy balls"),
]


def clean_tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z]+", text.lower()))


def is_clean_food_title(title: str) -> bool:
    low = title.lower()
    return not any(bad in low for bad in BAD_TITLE_WORDS)


def fetch_wikimedia_candidates() -> list[dict]:
    candidates = []
    seen = set()

    for tag, query in WIKIMEDIA_QUERIES:
        q_enc = urllib.parse.quote(query)
        url = (
            f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
            f"&gsrnamespace=6&gsrsearch={q_enc}&gsrlimit=40"
            f"&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=800&format=json"
        )
        req = urllib.request.Request(
            url, headers={"User-Agent": "NourishRecipeApp/1.0 (contact@example.com)"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                pages = data.get("query", {}).get("pages", {})
                for page in pages.values():
                    title = page.get("title", "")
                    if not is_clean_food_title(title):
                        continue
                    infos = page.get("imageinfo") or []
                    if not infos:
                        continue
                    info = infos[0]
                    mime = info.get("mime", "")
                    w = info.get("width", 0)
                    h = info.get("height", 0)
                    if mime not in ("image/jpeg", "image/png", "image/webp"):
                        continue
                    if w < 400 or h < 280:
                        continue
                    img_url = info.get("thumburl") or info.get("url")
                    if not img_url or img_url in seen:
                        continue
                    seen.add(img_url)
                    clean_t = title.replace("File:", "").replace("_", " ")
                    candidates.append({
                        "url": img_url,
                        "title": clean_t,
                        "tag": tag,
                        "source": "wikimedia",
                        "tokens": clean_tokens(clean_t) | {tag},
                    })
        except Exception as e:
            print("Wiki warn:", query, e)
        time.sleep(0.12)

    return candidates


def fetch_openverse_candidates() -> list[dict]:
    candidates = []
    seen = set()
    for tag, query in OPENVERSE_QUERIES:
        q_enc = urllib.parse.quote(query)
        url = f"https://api.openverse.org/v1/images/?q={q_enc}&page_size=20&license_type=commercial"
        req = urllib.request.Request(url, headers={"User-Agent": "NourishRecipeApp/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                d = json.loads(r.read())
                for item in d.get("results") or []:
                    u = item.get("url") or ""
                    title = item.get("title") or query
                    if not u.startswith("https://"):
                        continue
                    if not is_clean_food_title(title):
                        continue
                    if u in seen:
                        continue
                    seen.add(u)
                    candidates.append({
                        "url": u,
                        "title": title,
                        "tag": tag,
                        "source": "openverse",
                        "tokens": clean_tokens(title) | {tag},
                    })
        except Exception as e:
            print("Openverse warn:", query, e)
        time.sleep(0.15)
    return candidates


def fetch_themealdb_candidates() -> list[dict]:
    candidates = []
    seen = set()

    def fetch_letter(ch: str):
        items = []
        try:
            url = f"https://www.themealdb.com/api/json/v1/1/search.php?f={ch}"
            with urllib.request.urlopen(url, timeout=10) as r:
                d = json.loads(r.read())
                for m in d.get("meals") or []:
                    thumb = m.get("strMealThumb")
                    name = m.get("strMeal", "")
                    cat = (m.get("strCategory") or "").lower()
                    if not thumb or not name:
                        continue
                    if cat in ("dessert",) and not any(
                        w in name.lower()
                        for w in ("berry", "apple", "pear", "oat", "yogurt", "fruit", "pancake")
                    ):
                        continue
                    tag = cat or "meal"
                    items.append({
                        "url": thumb,
                        "title": f"{name} ({cat})",
                        "tag": tag,
                        "source": "themealdb",
                        "tokens": clean_tokens(f"{name} {cat} {m.get('strTags') or ''}"),
                    })
        except Exception:
            pass
        return items

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        for batch in ex.map(fetch_letter, list(string.ascii_lowercase)):
            for c in batch:
                if c["url"] not in seen:
                    seen.add(c["url"])
                    candidates.append(c)
    return candidates


SUBCATEGORY_AFFINITY = {
    "Eggs and Omelets": {"omelet", "omelette", "frittata", "egg", "eggs", "scramble"},
    "Oatmeal and Overnight Oats": {"oatmeal", "oats", "porridge", "oat", "chia", "overnight"},
    "Greek Yogurt": {"yogurt", "yoghurt", "parfait", "berries", "granola"},
    "Smoothies": {"smoothie", "shake", "blend"},
    "Breakfast Bowls": {"bowl", "quinoa", "egg", "avocado", "farro", "breakfast"},
    "Whole-Grain Toast": {"toast", "bread", "avocado", "ricotta", "bruschetta"},
    "Pancakes and Waffles": {"pancake", "pancakes", "waffle", "waffles", "crepe"},
    "Breakfast Wraps": {"wrap", "burrito", "tortilla", "quesadilla", "taco"},
    "High-Protein Breakfasts": {"egg", "yogurt", "cottage", "tofu", "scramble", "omelet", "breakfast"},
    "Quick Breakfasts": {"yogurt", "toast", "smoothie", "oats", "egg", "breakfast"},
    "Chicken": {"chicken", "poultry", "pollo"},
    "Turkey": {"turkey", "poultry", "meatball", "chili"},
    "Beef": {"beef", "steak", "sirloin", "stir", "pepper"},
    "Pork": {"pork", "tenderloin", "chop"},
    "Seafood": {"salmon", "fish", "cod", "tuna", "shrimp", "prawn", "seafood"},
    "Salads": {"salad", "greens", "spinach", "romaine", "chickpea"},
    "Wraps": {"wrap", "tortilla", "burrito", "roll"},
    "Sandwiches": {"sandwich", "panini", "toast", "bread"},
    "Grain Bowls": {"bowl", "quinoa", "farro", "rice", "buddha", "grain"},
    "Soups": {"soup", "stew", "broth", "chowder", "chili", "lentil"},
    "Vegetarian": {"vegetarian", "vegan", "tofu", "lentil", "chickpea", "bean", "vegetable"},
    "Meal Prep": {"bowl", "salad", "chicken", "quinoa", "farro", "meal"},
    "Quick Lunches": {"salad", "wrap", "sandwich", "bowl", "tuna"},
    "Pasta and Noodles": {"pasta", "penne", "spaghetti", "noodle", "noodles", "soba", "macaroni"},
    "Rice and Grain Dishes": {"rice", "risotto", "pilaf", "quinoa", "farro", "fried"},
    "Vegetables": {"vegetable", "vegetables", "broccoli", "cauliflower", "squash", "eggplant", "pepper"},
    "Casseroles": {"casserole", "bake", "gratin", "lasagna"},
    "Sheet Pan Meals": {"roasted", "sheet", "baked", "chicken", "salmon", "vegetables"},
    "Slow Cooker": {"stew", "chili", "soup", "slow", "braised"},
    "Air Fryer": {"crispy", "roasted", "chicken", "pork", "salmon", "air"},
    "One-Pot Meals": {"skillet", "pot", "stew", "curry", "chili", "pasta"},
    "Mexican-Inspired": {"mexican", "fajita", "taco", "burrito", "enchilada", "black", "salsa"},
    "Italian-Inspired": {"italian", "pasta", "marinara", "tuscan", "parmesan", "basil"},
    "Asian-Inspired": {"asian", "stir", "sesame", "ginger", "soba", "tofu", "miso", "teriyaki", "curry"},
    "Quick 30-Minute Meals": {"skillet", "stir", "salmon", "pasta", "chicken", "shrimp"},
    "Greek Yogurt Snacks": {"yogurt", "yoghurt", "parfait", "tzatziki", "dip"},
    "Fruit and Protein": {"apple", "pear", "berry", "strawberry", "blueberry", "banana", "almond", "peanut"},
    "Nuts and Seeds": {"almond", "almonds", "walnut", "walnuts", "nut", "nuts", "seed", "seeds", "trail"},
    "Cottage Cheese": {"cottage", "cheese", "curd", "yogurt", "fruit"},
    "Vegetables and Dips": {"hummus", "dip", "guacamole", "carrot", "carrots", "cucumber", "pepper"},
    "Homemade Protein Snacks": {"energy", "balls", "bites", "oat", "muffin", "eggs"},
    "Quick Snacks": {"edamame", "hummus", "yogurt", "apple", "egg", "chickpeas", "nuts"},
    "Evening Snacks": {"toast", "yogurt", "oats", "cheese", "apple", "pudding"},
}


def score_candidate(recipe: dict, cand: dict) -> float:
    r_name_tokens = clean_tokens(recipe["name"])
    r_ing_tokens = set()
    for ing in recipe["ingredients"]:
        r_ing_tokens |= clean_tokens(ing.replace("_", " "))
    sub_tokens = SUBCATEGORY_AFFINITY.get(recipe["primarySubcategory"], set())

    c_tokens = cand["tokens"]
    score = 0.0

    score += len(sub_tokens & c_tokens) * 12.0
    score += len(r_name_tokens & c_tokens) * 7.0
    score += len(r_ing_tokens & c_tokens) * 4.0

    if recipe["mealCategory"] == "breakfast":
        if c_tokens & {"beef", "pork", "steak", "curry", "soup", "stew", "shrimp", "pasta", "chili"}:
            score -= 25.0
    if recipe["mealCategory"] == "snack":
        if c_tokens & {"steak", "roast", "stew", "lasagna", "casserole", "pork", "beef"}:
            score -= 20.0
    if "Vegetarian" in recipe["primarySubcategory"] or recipe["primarySubcategory"] in (
        "Vegetables", "Fruit and Protein", "Nuts and Seeds", "Vegetables and Dips"
    ):
        if c_tokens & {"beef", "chicken", "pork", "steak", "lamb", "fish", "salmon", "shrimp", "turkey"}:
            score -= 30.0
    if recipe["primarySubcategory"] == "Seafood" or any(
        w in r_name_tokens for w in ("salmon", "cod", "shrimp", "tuna")
    ):
        if c_tokens & {"chicken", "beef", "pork", "steak"}:
            score -= 15.0

    if cand["source"] in ("wikimedia", "openverse"):
        score += 1.5

    return score


def verify_url(url: str) -> bool:
    try:
        req = urllib.request.Request(
            url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=6) as r:
            ctype = r.headers.get("Content-Type", "")
            return r.status == 200 and ctype.startswith("image/")
    except Exception:
        try:
            req2 = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req2, timeout=6) as r2:
                ctype = r2.headers.get("Content-Type", "")
                return r2.status == 200 and ctype.startswith("image/")
        except Exception:
            return False


def main():
    recipes = json.loads(META_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(recipes)} recipes")

    print("Fetching Wikimedia Commons food photos...")
    wiki_cands = fetch_wikimedia_candidates()
    print(f"Wikimedia candidates: {len(wiki_cands)}")

    print("Fetching Openverse food photos...")
    ov_cands = fetch_openverse_candidates()
    print(f"Openverse candidates: {len(ov_cands)}")

    print("Fetching TheMealDB food photos...")
    tmdb_cands = fetch_themealdb_candidates()
    print(f"TheMealDB candidates: {len(tmdb_cands)}")

    seen_urls = set()
    all_cands = []
    for c in wiki_cands + ov_cands + tmdb_cands:
        if c["url"] not in seen_urls:
            seen_urls.add(c["url"])
            all_cands.append(c)

    print(f"Total raw unique candidate URLs: {len(all_cands)}")

    print("Verifying candidate URLs (HTTP 200 + image/*)...")
    verified = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as ex:
        results = list(ex.map(lambda c: (c, verify_url(c["url"])), all_cands))
    for c, ok in results:
        if ok:
            verified.append(c)
    print(f"Verified working unique image URLs: {len(verified)}")

    if len(verified) < len(recipes):
        raise RuntimeError(
            f"Not enough verified unique images ({len(verified)}) for {len(recipes)} recipes!"
        )

    used_urls = set()
    image_map = {}

    priority_order = sorted(
        recipes,
        key=lambda r: (
            0 if r["mealCategory"] in ("snack", "breakfast") else 1,
            r["primarySubcategory"],
            r["id"],
        ),
    )

    for recipe in priority_order:
        best_cand = None
        best_score = -1e9
        for cand in verified:
            if cand["url"] in used_urls:
                continue
            sc = score_candidate(recipe, cand)
            if sc > best_score:
                best_score = sc
                best_cand = cand
        if best_cand is None:
            raise RuntimeError(f"Exhausted candidates at {recipe['id']}")
        used_urls.add(best_cand["url"])
        image_map[recipe["id"]] = best_cand["url"]

    OUT_PATH.write_text(json.dumps(image_map, indent=2), encoding="utf-8")
    print(f"Wrote {len(image_map)} unique image mappings to {OUT_PATH}")
    assert len(set(image_map.values())) == len(recipes)
    print("Confirmed 100% unique image URLs across all recipes!")


if __name__ == "__main__":
    main()
