"""
호칭운세 - 가챠/운세 로직
실제 게임의 대사/음성/이미지를 사용하지 않고, 게임별 '호칭' 사실 정보만 참고해
전부 새로 창작한 운세 문구를 생성합니다.
"""
import hashlib
import random

PITY_LIMIT = 10  # 이 횟수 안에 SSR/UR이 없으면 다음 소환은 SSR/UR 확정

ENTRIES = [
    {"id": "sense",    "term": "센세",     "game": "블루 아카이브",         "tier": "UR",  "weight": 1.0, "theme": "school"},
    {"id": "traveler", "term": "여행자",   "game": "원신",                 "tier": "SSR", "weight": 2.5, "theme": "element"},
    {"id": "trainer",  "term": "트레이너", "game": "우마무스메 프리티 더비", "tier": "SSR", "weight": 2.5, "theme": "race"},
    {"id": "nikke",    "term": "지휘관",   "game": "니케: 승리의 여신",      "tier": "SR",  "weight": 6.0, "theme": "tactics"},
    {"id": "doctor",   "term": "박사",     "game": "명일방주",              "tier": "SR",  "weight": 6.0, "theme": "research"},
    {"id": "captain",  "term": "함장",     "game": "붕괴3rd",               "tier": "SR",  "weight": 6.0, "theme": "voyage"},
    {"id": "master",   "term": "마스터",   "game": "Fate/Grand Order",     "tier": "SR",  "weight": 6.0, "theme": "summon"},
    {"id": "gf",       "term": "지휘관",   "game": "소녀전선",              "tier": "R",   "weight": 23.0, "theme": "arsenal"},
    {"id": "trailbz",  "term": "개척자",   "game": "붕괴: 스타레일",        "tier": "R",   "weight": 23.0, "theme": "explore"},
    {"id": "producer", "term": "프로듀서", "game": "아이돌마스터",          "tier": "R",   "weight": 24.0, "theme": "idol"},
]
ENTRIES_BY_ID = {e["id"]: e for e in ENTRIES}

THEME_ITEMS = {
    "school":   ["샤프 한 자루", "따뜻한 코코아", "손수건", "필기 노트"],
    "element":  ["바람개비", "달콤달콤 닭고기 스튜", "일곱신상의 깃털", "반짝이는 원석"],
    "race":     ["편한 운동화", "물통", "스톱워치", "발목 보호대"],
    "tactics":  ["접이식 지도", "통신기", "따뜻한 커피", "작전 수첩"],
    "research": ["돋보기", "실험용 장갑", "메모지", "오래된 도감"],
    "voyage":   ["나침반", "로프", "랜턴", "항해 일지"],
    "summon":   ["오래된 열쇠", "작은 촛불", "낡은 계약서", "은반지"],
    "arsenal":  ["윤활유 한 병", "드라이버 세트", "작업 장갑", "예비 부품"],
    "explore":  ["보온병", "접이식 지도", "손전등", "비상식량"],
    "idol":     ["콘서트 펜라이트", "스케줄 다이어리", "에너지 드링크", "무대용 수건"],
}

THEME_TEXT = {
    "school": [
        "오늘은 샬레 교무실 창가에 눈부신 빛이 쏟아지는 날이에요. {item}을(를) 챙기면 곁에 있는 학생들과의 신뢰가 깊어져요.",
        "방과후 자습 시간처럼 평화롭고 따스한 하루. {color} 계열 소지품이 최상의 행운을 데려옵니다.",
        "누군가 조용히 당신에게 기대를 품고 다가오는 날. {num}시쯤 좋은 대화가 오갈 거예요.",
        "믿고 이끌어주는 당신의 다정함이 빛을 발하는 하루입니다.",
    ],
    "element": [
        "티바트 대륙의 자유로운 바람이 당신의 앞길을 인도하는 날이에요. {item}이(가) 여정에 큰 힘이 돼요.",
        "일곱신상에 바치는 공물처럼 값진 결실이 맺히는 하루. {color} 색상이 원소의 축복을 불러옵니다.",
        "{num}번째 발걸음에서 뜻밖의 숨겨진 보물 상자를 발견할 예감이에요.",
        "페이몬과 함께하는 모험처럼 웃음이 끊이지 않는 순조로운 하루입니다.",
    ],
    "race": [
        "출발선에 선 것처럼 두근거리는 하루예요. {item}을(를) 곁에 두면 막판 스퍼트에 힘이 실려요.",
        "트랙 위 바람이 유독 순조로운 날이에요. {color} 컬러가 오늘의 승부수예요.",
        "{num}번째 시도에서 예상 밖의 좋은 결과가 나올 수 있어요. 포기하지 마세요.",
        "훈련 일지를 다시 펼쳐볼 타이밍이에요. 기본기를 점검하면 흐름이 좋아져요.",
    ],
    "tactics": [
        "작전 회의실 공기가 유독 맑은 날이에요. {item}을(를) 챙기면 판단력이 또렷해져요.",
        "{color} 신호탄이 뜨는 순간을 주의 깊게 보세요. 기회가 스쳐 지나갈 수 있어요.",
        "{num}시 방향에서 예상치 못한 지원군이 나타나요.",
        "무리한 돌격보다 정찰이 어울리는 하루입니다.",
    ],
    "research": [
        "실험 노트에 새 가설을 적어보기 좋은 날이에요. {item}이(가) 뜻밖의 영감을 줄 거예요.",
        "{color} 계열 도구가 오늘의 연구를 순조롭게 만들어줘요.",
        "{num}번째 시도에서 예상 못한 발견이 있을 수 있어요.",
        "동료의 사소한 제안이 큰 힌트가 되는 하루예요.",
    ],
    "voyage": [
        "항로가 유독 순조로운 하루예요. {item}을(를) 챙기고 출항하세요.",
        "{color} 빛의 균열이 좋은 신호로 다가와요.",
        "{num}시 방향에 예상치 못한 기항지가 있을 수 있어요.",
        "선내 점검을 마치고 나면 마음이 한결 가벼워질 거예요.",
    ],
    "summon": [
        "계약의 불빛이 유독 밝게 빛나는 날이에요. {item}을(를) 지니면 인연이 깊어져요.",
        "{color} 마력의 파동이 오늘의 행운을 알려줘요.",
        "{num}번째 영창에서 뜻밖의 인연이 응답할 수 있어요.",
        "무리한 계약보다 신중한 협상이 어울리는 하루입니다.",
    ],
    "arsenal": [
        "정비창 공구 소리가 경쾌하게 울리는 날이에요. {item}을(를) 점검해두면 좋아요.",
        "{color} 도료로 마감한 장비가 오늘따라 눈에 띄어요.",
        "{num}번째 정비에서 숨겨진 문제를 발견할 수 있어요.",
        "작은 개선이 전체 성능을 끌어올리는 하루입니다.",
    ],
    "explore": [
        "낯선 정거장에 발을 내딛기 좋은 날이에요. {item}을(를) 챙기면 여정이 즐거워져요.",
        "{color} 빛의 성운이 방향을 알려줘요.",
        "{num}번째 갈림길에서 뜻밖의 동행을 만날 수 있어요.",
        "지도에 없는 길이 오히려 지름길일 수 있어요.",
    ],
    "idol": [
        "오늘의 스테이지는 만원 관객의 함성으로 빛날 예감이에요. {item}을(를) 챙기면 담당 아이돌과의 유대가 깊어져요.",
        "무대 위 스포트라이트가 당신을 정면으로 비추는 날. {color} 펜라이트 색상이 최고의 행운을 줍니다.",
        "{num}번째 세트리스트 곡에서 관객 모두가 하나 되는 기적이 일어납니다.",
        "당신의 프로듀스가 모두를 최고의 탑 아이돌로 이끄는 하루입니다.",
    ],
}

COLORS = ["하늘색", "자수정색", "금빛", "산호색", "은빛", "라벤더", "에메랄드", "샤벳오렌지", "프리즘무지개"]


def _seed_from(date_str: str, salt: str) -> int:
    digest = hashlib.sha256(f"{date_str}:{salt}".encode("utf-8")).hexdigest()
    return int(digest, 16) % (2**32)


def _pick_entry(rng: random.Random, force_ssr: bool):
    pool = [e for e in ENTRIES if e["tier"] in ("UR", "SSR")] if force_ssr else ENTRIES
    total = sum(e["weight"] for e in pool)
    roll = rng.random() * total
    for e in pool:
        if roll < e["weight"]:
            return e
        roll -= e["weight"]
    return pool[-1]


def draw(date_str: str, salt: str, pity: int) -> dict:
    seed = _seed_from(date_str, salt)
    rng = random.Random(seed)

    force_ssr = pity >= PITY_LIMIT - 1
    entry = _pick_entry(rng, force_ssr)

    theme = entry["theme"]
    items = THEME_ITEMS.get(theme, ["부적"])
    item = rng.choice(items)
    color = rng.choice(COLORS)
    num = rng.randint(1, 9)

    texts = THEME_TEXT.get(theme, ["오늘 하루도 좋은 일이 가득할 거예요."])
    raw_text = rng.choice(texts)
    text = raw_text.format(item=item, color=color, num=num)

    next_pity = 0 if entry["tier"] in ("UR", "SSR") else pity + 1

    return {
        "entry_id": entry["id"],
        "term": entry["term"],
        "game": entry["game"],
        "tier": entry["tier"],
        "theme": theme,
        "text": text,
        "color": color,
        "num": num,
        "next_pity": next_pity,
    }
