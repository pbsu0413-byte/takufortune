# 호칭운세 (Flask 버전)

서브컬처 게임에서 "센세 / 트레이너 / 지휘관" 같은 호칭으로 불리는 밈을 오마주한
1일 1회 호칭 가챠·운세 사이트입니다. 실제 게임의 음성·이미지·대사는 사용하지 않고
전부 새로 쓴 창작 텍스트로 구성되어 있습니다.

## 로컬 실행

```bash
python3 -m venv venv
source venv/bin/activate        # Windows는 venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

`http://localhost:5000` 접속하면 됩니다. 처음 접속하면 서버가 쿠키(`tf_uid`)로
익명 사용자를 발급하고, `data/app.db` (SQLite)에 뽑기 기록·천장 카운트를 저장합니다.

## 구조

```
titlefortune/
  app.py            # Flask 라우트 (/ , /api/pull)
  gacha.py           # 확률/운세 텍스트 로직 (프레임워크 독립적)
  templates/index.html
  static/style.css
  static/script.js
  data/app.db         # 최초 실행 시 자동 생성 (SQLite)
```

## 동작 방식

- 쿠키(`tf_uid`)로 사용자를 구분하는 **익명 세션** 방식입니다. 로그인은 없습니다.
- 같은 날짜 + 사용자별 salt로 결과를 결정하기 때문에, 하루 안에서는 새로고침해도
  같은 결과가 나옵니다 (서버가 `pulls` 테이블에 오늘 기록이 있는지 먼저 확인).
- 천장(`PITY_LIMIT = 10`, `gacha.py`)은 사용자별 `users.pity` 값으로 관리되며,
  SSR을 뽑으면 0으로 초기화됩니다.

## 다음에 고려할 것들

- **다른 기기에서도 이어보고 싶다면**: 지금은 쿠키 기반이라 브라우저/기기별로 기록이
  분리됩니다. 이메일 로그인이나 소셜 로그인을 추가하면 기기 간 동기화가 가능해집니다.
- **여러 유저 랭킹/통계**: `pulls` 테이블이 이미 있으니, 전체 유저의 등급 분포 같은
  집계 쿼리를 추가하면 됩니다.
- **배포**: Render, Railway, Fly.io 같은 곳에 올리면 됩니다. SQLite 파일은 디스크가
  영구적으로 유지되는 플랜에서만 안전합니다 (일부 무료 플랜은 재배포 시 파일이
  초기화될 수 있어요). 트래픽이 늘어나면 Postgres 같은 관리형 DB로 옮기는 걸 권장합니다.
- **HTTPS 배포 시**: `app.py`의 `set_uid_cookie`에서 `secure=True`를 추가해주세요.
- **효과음/TTS/이미지**: `static/script.js`에 Web Speech API(TTS)나 Web Audio 효과음을
  추가하는 식으로 확장할 수 있습니다. AI 생성 이미지를 쓰려면 별도로 생성한 이미지
  파일을 `static/`에 넣고 템플릿에서 참조하면 됩니다.
