# Boardmap Development Plan

> 2026-07-12: 실험 단계 운영 방식을 공개 Developer Console로 변경했다. 로그인 UI를 제거하고 멤버·플레이 세션·참여 관계 CRUD, 백업 가져오기, 초기화를 모두 Supabase 직접 저장으로 전환한다. 이 공개 쓰기 정책은 프로토타입 전용이며 운영 단계 전에 인증/RLS를 다시 제한해야 한다.

> 2026-07-12: Supabase MCP 연결을 확인하고 MVP 스키마, 공개 읽기/인증 쓰기 RLS, `game_progress` view, 157개 게임과 169개 맵 노드 seed를 원격 프로젝트에 적용했다. Auth 가입 시 `members` 레코드를 자동 생성하고 `member`/`admin` 역할을 구분하는 정책을 추가했으며, 브라우저용 데이터 소스와 로그인 화면을 마련했다. Project URL과 Publishable Key 설정 및 최초 계정 관리자 승격 후 실제 쓰기 통합 검증이 남아 있다.

> 2026-07-12: Flight 완료 후 표시되는 Enter Map을 화면 중앙의 대형 캡슐형 CTA로 재배치하고, 확대·광택 스윕·내부 링·글로우 호버 및 키보드 포커스 효과를 추가했다.

> 2026-07-12: 알파 전환 영상의 키 범위와 가장자리 블렌딩을 다시 조정해 구름 외곽에 원본 검은 배경이 남던 블랙 매트를 자산 단계에서 제거했다. screen 합성도 보조로 유지한다.

> 2026-07-11: 전환 영상의 검은 배경을 실제 알파 채널로 제거한 WebM 자산으로 교체했다. 구름은 불투명하게 유지되고, 투명 영역에서는 전환 전후 화면이 영상 뒤로 직접 보인다.

이 문서는 Boardmap 개발의 기준 문서다. 앞으로 새 기능을 구현하기 전에는 먼저 이 문서에 목적, 범위, 구현 방식, 검증 기준을 작성한 뒤 개발을 진행한다.

현재 목표는 보드게임 소모임이 어떤 보드게임을 플레이했는지 맵 위에서 한눈에 확인하고, 플레이 기록을 계속 축적할 수 있는 모바일 웹 서비스를 만드는 것이다.

## 0. 작업 원칙

### 개발 순서

1. `DEVELOPMENT_PLAN.md`에 이번 작업의 목적과 구현 방식을 먼저 작성한다.
2. 작업 범위를 `이번에 할 것`과 `이번에 하지 않을 것`으로 나눈다.
3. 데이터 구조 또는 화면 구조가 바뀌면 이 문서의 관련 섹션을 갱신한다.
4. 코드를 수정한다.
5. 검증 체크리스트를 실행한다.
6. 의미 있는 단위로 커밋한다.

### 현재 우선순위

- 지금은 오브젝트, 잠금 해제 콘텐츠, 알깨기, 성장 시스템을 만들지 않는다.
- 지금은 보드게임 맵과 보드게임 목록이 1대1로 대응되는 구조를 먼저 만든다.
- 사용자는 맵 위에서 어떤 게임을 플레이했고, 어떤 게임이 아직 남았는지 확인할 수 있어야 한다.
- 플레이 세션 기록은 이후 진척률, 멤버별 이력, 보상 시스템의 기반 데이터가 된다.
- 단, 게임 노드 자체의 `잠김/브론즈/실버/골드` 상태 표현은 MVP 범위에 포함한다.

## 1. 제품 목적

Boardmap은 보드게임 소모임의 플레이 문화를 유지하고 참여 동기를 강화하기 위한 웹 서비스다.

핵심 가치는 다음과 같다.

- 보드게임 플레이 현황을 시각적으로 보여준다.
- 소모임 전체의 진척률을 누적 기록으로 만든다.
- 멤버가 어떤 게임에 참여했는지 확인할 수 있게 한다.
- 아직 플레이하지 않은 게임을 자연스럽게 다음 목표로 보여준다.
- 나중에 보상, 오브젝트, 잠금 해제 콘텐츠를 붙일 수 있는 기반을 만든다.

## 2. SRR 정리

### Must

| ID | 요구사항 | 현재 개발 방향 |
| --- | --- | --- |
| M001 | 보드게임별 플레이 완료 여부를 기록하고 조회할 수 있어야 한다. | 각 보드게임을 `board_games` 데이터로 관리하고, 플레이 세션 존재 여부로 완료 상태를 계산한다. |
| M002 | 소모임 전체의 보드게임 플레이 진척률을 수치 및 시각 형태로 표시할 수 있어야 한다. | 전체 게임 수 대비 플레이 완료 게임 수를 계산하고, 맵 노드 상태와 퍼센트 UI로 표시한다. |
| M003 | 플레이 세션 등록 시 날짜, 게임명, 참여 멤버를 최소 입력 항목으로 요구해야 한다. | 세션 등록 폼의 필수 필드로 `date`, `game_id`, `member_ids`를 둔다. |
| M004 | 멤버별 플레이 참여 이력을 조회할 수 있어야 한다. | `play_session_members` 관계 데이터를 기준으로 멤버별 참여 기록을 필터링한다. |
| M005 | 아직 플레이하지 않은 보드게임 목록을 별도로 표시할 수 있어야 한다. | `unplayed` 필터 및 별도 리스트 영역을 제공한다. |
| M006 | 플레이 기록 및 게임 결과에 따라 멤버에게 보상을 제공할 수 있어야 한다. | 현재는 보상 계산을 구현하지 않고, 이후 확장을 위해 데이터 모델만 예약한다. |
| M007 | 보상 누적을 통해 잠금 해제되는 콘텐츠 레이어를 포함해야 한다. | 현재 범위 제외. SDR에서 설계한 뒤 별도 구현한다. |
| M008 | 모바일 브라우저에서 별도 앱 설치 없이 정상 동작해야 한다. | 정적 웹 기반, 모바일 우선 레이아웃으로 개발한다. |
| M009 | 인증 없이 진척 현황 조회가 가능해야 하며, 기록 등록 및 보상 수령은 인증된 멤버만 수행할 수 있어야 한다. | 읽기는 public, 쓰기는 인증 필요 구조로 설계한다. 초기 프로토타입은 local data, 실제 저장은 Supabase Auth로 전환한다. |
| M010 | 오브젝트 상태 및 잠금 해제 이력이 멤버별로 영속 저장되어야 한다. | 현재 범위 제외. 단, 추후 `member_unlocks` 테이블을 추가할 수 있게 설계한다. |

### Should

| ID | 요구사항 | 현재 개발 방향 |
| --- | --- | --- |
| S001 | 보드게임에 대해 간단한 메모 또는 소감을 기록할 수 있어야 한다. | 세션 등록 시 optional `note` 필드를 둔다. |
| S002 | 플레이 기록 등록 후 누적 플레이 횟수 및 진척률이 즉시 갱신되어야 한다. | 세션 저장 후 상태를 다시 계산하고 UI를 즉시 갱신한다. |
| S003 | 가장 많이 플레이된 보드게임 상위 목록을 표시할 수 있어야 한다. | 세션 집계로 `top played games` 영역을 제공한다. |
| S004 | 멤버별 수집 또는 육성 가능한 고유 오브젝트를 제공해야 한다. | 현재 범위 제외. 보상/오브젝트 SDR 이후 구현한다. |
| S005 | 오브젝트 상태 변화를 플레이 행동과 연동해야 한다. | 현재 범위 제외. |

### May

| ID | 요구사항 | 현재 개발 방향 |
| --- | --- | --- |
| Y001 | 플레이 세션에 사진을 첨부할 수 있다. | Supabase Storage 도입 이후 추가 가능하게 둔다. |
| Y002 | 잠금 해제 콘텐츠 구조를 확장 가능하게 설계해야 한다. | 데이터 모델에 확장 지점을 예약한다. |
| Y003 | BGG 등 외부 DB와 연동해 메타데이터를 불러올 수 있다. | 초기에는 수동 입력. 이후 `bgg_id` 필드를 추가해 연동한다. |

## 3. 현재 완료 상태

### 히어로 섹션

- 영상 기반 히어로 섹션 구현 완료
- `video.currentTime` 직접 seek 방식 대신 프레임 시퀀스 기반 canvas 렌더링으로 전환
- `assets/sequence/flight-001.jpg`부터 `flight-241.jpg`까지 24fps 프레임 시퀀스 사용
- 현재 프레임과 다음 프레임을 alpha blending하여 스크롤 전환을 부드럽게 처리
- 전진감 보조 효과는 화면 중앙에서 바깥으로 약하게 퍼지는 방식으로 정리
- 다음 구현 단계는 히어로 스크롤이 끝까지 도달했을 때 World Atlas로 이동하는 진입 링크를 노출하는 것이다.

### 현재 파일 구조

```text
boardmap_codex2/
  index.html
  styles.css
  script.js
  README.md
  DEVELOPMENT_PLAN.md
  assets/
    source-flight.mp4
    frames/
      flight-01.jpg ... flight-08.jpg
    sequence/
      flight-001.jpg ... flight-241.jpg
    map/
      world-atlas-hub-v2.png
      regions/
        strategy-plains.png
        engine-highlands.png
        route-territory-coast.png
        social-isles.png
        wagering-port.png
        mystery-district.png
    data/
      maps.json
      map-regions.json
      board-games.json
      board-game-locations.json
      members.json
      play-sessions.json
      play-session-members.json
      boardmap-data.js
```

### 현재 맵 데이터 상태

- `보드게임_157종.csv`의 157개 보드게임을 모두 `board-games.json`으로 변환했다.
- 모든 보드게임은 하나의 `board-game-locations.json` 항목과 1대1로 연결되어 있다.
- 현재 배정은 실제 맵 이미지의 원형 패드 중심을 기준으로 한 `pad-aligned-v1`이다.
- 현재 세션 데이터는 비어 있으므로 모든 게임 노드는 `locked` 상태로 표시된다.

현재 지역별 노드 수:

| 지역 | 노드 수 |
| --- | ---: |
| Strategy Plains | 30 |
| Engine Highlands | 32 |
| Route & Territory Coast | 28 |
| Social Isles | 33 |
| Wagering Port | 20 |
| Mystery District | 26 |

여섯 지역의 실제 노드는 총 169개다. 157개 게임을 각각 하나의 노드에 연결하고, 남는 12개 노드는 `gameId: null`, `data: "none"`으로 저장한다. Social Isles와 Mystery District에서 수용하지 못한 게임은 여유 노드가 있는 지역으로 이동하되 `originalRegionId`를 보존한다.

## 4. 이번 제품 MVP 정의

### MVP 이름

Boardgame Map MVP

### MVP 목표

맵 위의 각 지점이 하나의 보드게임과 1대1로 대응된다. 사용자는 맵을 보면서 다음을 확인할 수 있다.

- 전체 보드게임 목록
- 아직 한 번도 플레이하지 않아 잠겨 있는 보드게임
- 한 번 이상 플레이해서 해금된 보드게임
- 플레이 횟수에 따라 브론즈, 실버, 골드로 상승한 보드게임
- 게임별 누적 플레이 횟수
- 게임별 최근 플레이 날짜
- 멤버별 참여 이력

### 유저 관점 핵심 시나리오

오늘 `A`, `B`, `C`, `D` 네 명이 특정 보드게임을 플레이했다고 가정한다.

1. 인증된 멤버가 플레이 세션을 등록한다.
2. 세션에는 날짜, 게임명, 참여 멤버 `A`, `B`, `C`, `D`가 들어간다.
3. 등록 직후 해당 보드게임의 누적 플레이 횟수가 1 증가한다.
4. 맵에서 해당 보드게임 노드가 잠김 상태에서 해금 상태로 바뀐다.
5. 누적 플레이 횟수에 따라 노드 등급이 `bronze`, `silver`, `gold` 중 하나로 표현된다.
6. 참여 멤버 `A`, `B`, `C`, `D`의 개인 참여 이력에도 해당 세션이 표시된다.

이 경험이 MVP의 중심이다. 사용자는 "오늘 우리가 맵의 어느 게임을 열었는지"와 "어떤 게임이 더 높은 등급이 되었는지"를 바로 느낄 수 있어야 한다.

### 157종 보드게임 대응 전략

현재 보드게임 CSV는 157종이며, 장르 분포는 다음과 같다.

| 장르 | 포함 수 |
| --- | ---: |
| 전략 | 82 |
| 심리 | 46 |
| 추리 | 19 |
| 베팅 | 18 |
| 마피아 | 15 |
| 협상 | 10 |
| 머더미스터리 | 9 |
| 방탈출 | 6 |

주의: 장르는 복수값을 가질 수 있다. 예를 들어 `전략, 심리`처럼 한 게임이 여러 장르에 걸칠 수 있다.

따라서 157개 노드를 하나의 맵에 모두 표시하지 않는다. 모바일에서 터치 영역이 작아지고, 상태 구분이 어려워지고, 새 게임 추가 시 배치가 망가지기 때문이다.

권장 구조:

```text
World Atlas
  -> Region Map 1
  -> Region Map 2
  -> Region Map 3
  -> ...
```

- `World Atlas`: 전체 진행률과 장르/지역 진입을 보여주는 허브 맵
- `Region Map`: 실제 보드게임 노드가 배치되는 상세 맵
- 각 Region Map은 20-35개 노드를 권장 상한으로 둔다.
- 35개를 넘는 장르는 하위 테마나 난이도/플레이타임 기준으로 쪼갠다.

World Atlas의 역할:

- 실제 보드게임 157개 노드를 모두 보여주는 맵이 아니다.
- 각 Region Map으로 이동하는 내비게이션 허브다.
- 사용자가 허브 맵만 보고도 어떤 구역이 어떤 장르/플레이 감각을 뜻하는지 알아야 한다.
- 따라서 허브 배경은 각 지역의 특성을 축약해서 보여주는 "미니 월드맵"이어야 한다.
- 예: 초원은 Strategy Plains, 산지는 Engine Highlands, 해안 길은 Route & Territory Coast, 등불 섬은 Social Isles, 항구는 Wagering Port, 밤의 도시는 Mystery District로 명확히 읽혀야 한다.
- 허브 이미지 안에는 큰 노드, 원형 패드, 버튼처럼 보이는 빈 착지점, UI 마커를 넣지 않는다.
- 각 지역은 이미지 위에 보이지 않는 HTML/SVG 클릭 오버레이로 구성한다. 사용자는 초원, 산지, 항구 같은 "영역 자체"를 누른다고 느껴야 한다.
- 진행률 또는 등급 요약 배지가 필요하면 이미지에 굽지 않고 HTML/SVG로 작게 올린다.

초기 추천 분할:

| 맵 | 목적 | 예상 기준 |
| --- | --- | --- |
| Strategy Plains | 전략 게임 중 입문/카드/세트/추상 계열 | primaryGenre `전략`, Easy/Normal, 카드/세트/조합 테마 |
| Engine Highlands | 전략 게임 중 빌드업/운영/자원/경제 계열 | 전략 + 빌드업/운영/주식/자원 |
| Route & Territory Coast | 전략 게임 중 길 연결/영역/배치 계열 | 전략 + 경로/영역/타일/배치 |
| Social Isles | 심리/마피아/협상 중심 | primaryGenre `심리`, `마피아`, `협상` |
| Wagering Port | 베팅/예측/경매 중심 | `베팅` 포함 |
| Mystery District | 추리/머더미스터리/방탈출 중심 | `추리`, `머더미스터리`, `방탈출` |

이 분할은 최초 제안이며, 실제 CSV 전체를 보고 노드 수가 20-35개 정도로 맞도록 조정한다.

새 보드게임 추가 원칙:

- 새 게임은 먼저 `board_games`에 추가한다.
- 자동으로 `placement_status = "unplaced"` 상태가 된다.
- 관리자 또는 개발자가 적절한 `map_id`, `region_id`, `map_x`, `map_y`를 배정한다.
- 배정 전에도 리스트에는 표시되지만, 맵에는 "unplaced tray" 또는 "새로 들어온 게임" 영역으로 표시한다.
- 이렇게 하면 새 게임 추가가 기존 맵 좌표를 깨지 않는다.

### 이번 MVP에서 하지 않을 것

- 오브젝트 배치
- 알깨기, 성장, 진화 등 육성 시스템
- 잠금 해제 콘텐츠 레이어
- 사진 업로드
- BGG 자동 연동
- 복잡한 권한 관리 UI

단, 이후 구현을 막지 않도록 데이터 모델에는 확장 가능성을 남긴다.

주의: 여기서 제외하는 "잠금 해제 콘텐츠 레이어"는 추가 오브젝트, 스토리, 보상 콘텐츠를 의미한다. 보드게임 노드가 플레이 여부에 따라 잠김에서 해금 상태로 바뀌는 것은 이번 MVP 범위에 포함한다.

## 5. 구현 방식

### 전체 방향

현재 프로젝트는 빌드 도구 없는 정적 HTML/CSS/JS 구조다. 다음 단계에서는 당장 프레임워크를 도입하지 않고, 먼저 기능 경계를 분리한다.

이 서비스는 필연적으로 데이터베이스가 필요하다. 보드게임 해금 상태, 브론즈/실버/골드 등급, 멤버별 참여 이력, 진척률은 모두 누적 플레이 세션 데이터에서 계산되기 때문이다. 따라서 초기 로컬 프로토타입도 실제 DB 스키마와 같은 형태로 만든다.

기본 전략:

- DB-first로 데이터 구조를 먼저 확정한다.
- UI는 JSON, localStorage, Supabase를 직접 알지 않는다.
- 모든 데이터 접근은 `data.js` 또는 이후 `repositories/*` 계층을 통해서만 수행한다.
- 로컬 JSON과 localStorage는 실제 DB 연결 전까지 사용하는 mock adapter로만 취급한다.
- Supabase로 전환할 때 UI 컴포넌트와 화면 로직을 크게 바꾸지 않는 것을 목표로 한다.

단기 구현:

- Vanilla HTML/CSS/JS 유지
- `script.js`를 역할별 모듈로 분리할 준비
- DB 스키마와 동일한 로컬 JSON 데이터로 맵과 기록 UI를 먼저 구현
- 브라우저 `localStorage`는 `play_sessions`와 `play_session_members`의 임시 write adapter로 사용
- 화면 코드는 `createPlaySession`, `getGameProgress`, `getMemberHistory` 같은 저장소 함수를 통해서만 데이터를 다룸

중기 구현:

- Supabase 프로젝트와 Postgres 테이블 도입
- Public read, authenticated write 구조 적용
- 실제 멤버 인증 및 영속 저장 적용
- 로컬 adapter를 Supabase adapter로 교체

장기 구현:

- 보상/오브젝트/잠금 해제 SDR 작성
- unlock layer와 member object 상태를 별도 도메인으로 추가

### 왜 이 방식으로 가는가

- 현재 히어로가 정적 배포에 적합한 구조다.
- 하지만 핵심 기능은 누적 기록 기반이므로 DB 계약 없이 화면부터 만들면 나중에 재작업이 커진다.
- 먼저 DB 형태를 고정하고 로컬 mock으로 UX를 확정한 뒤 Supabase로 옮기면 재작업을 줄일 수 있다.
- Supabase는 모바일 웹, public read, authenticated write, 파일 업로드 확장에 적합하다.

## 6. 목표 화면 구조

### 1. Hero

현재 완성된 스크롤 기반 비주얼을 유지한다.

역할:

- 서비스 첫 인상
- Boardmap의 탐험/진척 감각 전달
- 아래 실제 맵 서비스로 진입시키는 전환부

### 2. Boardgame Map

핵심 섹션이다.

구성:

- 맵 영역
- 게임 노드
- 잠김/브론즈/실버/골드 상태 표시
- 전체 진척률
- 필터: 전체, 잠김, 브론즈 이상, 실버 이상, 골드
- 노드 선택 시 게임 상세 패널 표시

게임 노드 상태:

| 상태 | 조건 | 유저에게 보이는 의미 |
| --- | --- | --- |
| `locked` | 누적 플레이 0회 | 아직 우리 모임에서 플레이하지 않은 게임 |
| `bronze` | 누적 플레이 1-4회 | 한 번 이상 플레이해서 맵에서 해금된 게임 |
| `silver` | 누적 플레이 5-9회 | 여러 번 즐긴 검증된 게임 |
| `gold` | 누적 플레이 10회 이상 | 모임의 대표/인기 게임 |

상태는 별도 필드로 저장하지 않고, `play_sessions` 집계 결과로 계산한다. 같은 게임에 세션이 추가될 때마다 맵 노드 상태가 즉시 다시 계산되어야 한다.

### 3. Game Detail Panel

맵에서 게임을 선택했을 때 표시한다.

표시 정보:

- 게임명
- 현재 노드 상태: 잠김, 브론즈, 실버, 골드
- 누적 플레이 횟수
- 최근 플레이 날짜
- 참여했던 멤버 목록
- 최근 메모
- 세션 등록 버튼

### 4. Session Form

플레이 기록 등록 폼이다.

필수 입력:

- 날짜
- 게임명
- 참여 멤버

선택 입력:

- 메모
- 결과
- 사진은 나중에 추가

### 5. Progress Summary

소모임 전체 진척 현황을 보여준다.

표시 정보:

- 전체 게임 수
- 해금된 게임 수
- 잠겨 있는 게임 수
- 진척률
- 브론즈/실버/골드 개수
- 가장 많이 플레이된 게임

### 6. Member History

멤버별 참여 이력을 보여준다.

표시 정보:

- 멤버명
- 참여 세션 수
- 참여한 게임 목록
- 최근 참여일

## 7. 데이터 모델 초안

### board_games

보드게임 기본 데이터다.

```ts
type BoardGame = {
  id: string;
  title: string;
  subtitle?: string;
  primaryGenre: string;
  genres: string[];
  theme?: string;
  mapId?: string;
  regionId?: string;
  mapX?: number;
  mapY?: number;
  placementStatus: "placed" | "unplaced" | "retired";
  sortOrder: number;
  bggId?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playTimeMinutes?: number;
  difficulty?: "Easy" | "Normal" | "Hard";
  tags?: string[];
};
```

### maps

여러 장의 맵을 관리하기 위한 데이터다.

```ts
type GameMap = {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
};
```

### map_regions

한 맵 안의 시각적 구역을 나타낸다.

```ts
type MapRegion = {
  id: string;
  mapId: string;
  title: string;
  genreKey?: string;
  description?: string;
  sortOrder: number;
};
```

### board_game_locations

보드게임과 맵 좌표를 분리해서 관리할 수도 있다. MVP에서는 `board_games`에 좌표를 직접 둘 수 있지만, 장기적으로는 이 테이블이 더 안전하다.

```ts
type BoardGameLocation = {
  nodeId?: string;
  nodeOrder?: number;
  gameId: string | null;
  data: { gameId: string } | "none";
  mapId: string;
  regionId?: string;
  originalRegionId?: string;
  x: number | null;
  y: number | null;
  placementStatus: "placed" | "unplaced" | "retired";
};
```

`nodeId`가 있고 `gameId`가 `null`인 레코드는 게임이 아직 연결되지 않은 빈 맵 노드다. 이때 `data`는 `"none"`이며 좌표와 노드 표시는 유지한다. 반대로 `placementStatus`가 `unplaced`인 게임 레코드는 노드가 없으므로 좌표가 `null`이다. 장기적으로 `board_games`는 게임 원장, `board_game_locations`는 맵 배치 정보로 분리한다.

### members

소모임 멤버 데이터다.

```ts
type Member = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  active: boolean;
};
```

### play_sessions

플레이 1회를 나타내는 데이터다.

```ts
type PlaySession = {
  id: string;
  gameId: string;
  playedAt: string;
  note?: string;
  createdBy?: string;
  createdAt: string;
};
```

### play_session_members

세션과 멤버의 N:M 관계다.

```ts
type PlaySessionMember = {
  sessionId: string;
  memberId: string;
  result?: string;
  score?: number;
};
```

### derived game status

게임 노드 상태는 저장 데이터가 아니라 파생 상태다.

```ts
type GameMapStatus = "locked" | "bronze" | "silver" | "gold";

function getGameMapStatus(playCount: number): GameMapStatus {
  if (playCount >= 10) return "gold";
  if (playCount >= 5) return "silver";
  if (playCount >= 1) return "bronze";
  return "locked";
}
```

진척률 계산에서 "플레이 완료"는 `bronze` 이상을 의미한다.

```ts
const unlockedGameCount = games.filter((game) => getGameMapStatus(game.playCount) !== "locked").length;
const progressRate = unlockedGameCount / games.length;
```

### database derived view

Supabase 전환 시 클라이언트가 매번 모든 세션을 내려받아 계산하지 않도록, DB에서 게임별 진행 상태를 계산하는 view 또는 RPC를 둔다.

개념상 필요한 결과:

```ts
type GameProgress = {
  gameId: string;
  playCount: number;
  lastPlayedAt?: string;
  status: GameMapStatus;
  participantCount: number;
};
```

초기 로컬 adapter도 이 결과와 같은 형태를 반환해야 한다. 즉, UI는 이 값이 JSON에서 계산됐는지 Supabase view에서 왔는지 몰라야 한다.

### data access contract

화면은 아래 함수 계약에만 의존한다.

```ts
type CreatePlaySessionInput = {
  gameId: string;
  playedAt: string;
  memberIds: string[];
  note?: string;
  result?: string;
};

type BoardmapDataSource = {
  getMaps(): Promise<GameMap[]>;
  getMapRegions(mapId?: string): Promise<MapRegion[]>;
  getBoardGames(): Promise<BoardGame[]>;
  getBoardGameLocations(): Promise<BoardGameLocation[]>;
  getMembers(): Promise<Member[]>;
  getPlaySessions(): Promise<PlaySession[]>;
  getGameProgress(): Promise<GameProgress[]>;
  getMemberHistory(memberId: string): Promise<PlaySession[]>;
  createPlaySession(input: CreatePlaySessionInput): Promise<PlaySession>;
};
```

초기 구현은 `localBoardmapDataSource`로 시작한다.

Supabase 전환 후에는 같은 계약을 가진 `supabaseBoardmapDataSource`로 교체한다.

금지사항:

- 맵 UI에서 `fetch("assets/data/...")`를 직접 호출하지 않는다.
- 세션 폼에서 `localStorage`를 직접 읽거나 쓰지 않는다.
- UI에서 Supabase client를 직접 호출하지 않는다.

### reserved future tables

보상/오브젝트는 지금 구현하지 않지만, 이후 아래 구조를 추가할 수 있게 둔다.

```ts
type RewardLedger = {
  id: string;
  memberId: string;
  sessionId?: string;
  points: number;
  reason: string;
  createdAt: string;
};

type MemberUnlock = {
  id: string;
  memberId: string;
  unlockKey: string;
  unlockedAt: string;
};
```

## 8. DB-shaped 로컬 프로토타입 데이터 구조

Supabase 전환 전에는 아래 파일을 추가해 로컬 프로토타입을 만든다. 이 파일들은 단순 샘플 데이터가 아니라 실제 DB 테이블을 흉내내는 mock data다.

```text
assets/data/
  maps.json
  map-regions.json
  board-games.json
  board-game-locations.json
  members.json
  play-sessions.json
  play-session-members.json
```

원칙:

- 파일의 ID, 관계, 필드명은 이후 DB 스키마와 최대한 일치시킨다.
- 세션과 멤버 관계는 `memberIds` 배열 하나로 뭉개지 않고, 실제 DB와 같은 N:M 관계 파일로 관리한다.
- localStorage에 저장하는 새 세션도 같은 구조로 저장한다.
- UI는 이 파일을 직접 읽지 않고 `data.js`를 통해 읽는다.

### board-games.json 예시

```json
[
  {
    "id": "azul",
    "title": "Azul",
    "primaryGenre": "전략",
    "genres": ["전략"],
    "theme": "세트 모으기",
    "sortOrder": 1,
    "tags": ["abstract", "tile"]
  }
]
```

### maps.json 예시

```json
[
  {
    "id": "world-atlas",
    "title": "World Atlas",
    "imageUrl": "assets/map/world-atlas-hub-v2.png",
    "sortOrder": 1,
    "active": true
  }
]
```

### board-game-locations.json 예시

```json
[
  {
    "gameId": "azul",
    "mapId": "world-atlas",
    "regionId": "strategy-plains",
    "x": 24,
    "y": 42,
    "placementStatus": "placed"
  }
]
```

### members.json 예시

```json
[
  {
    "id": "member-001",
    "displayName": "Alex",
    "active": true
  }
]
```

### play-sessions.json 예시

```json
[
  {
    "id": "session-001",
    "gameId": "azul",
    "playedAt": "2026-07-10",
    "note": "First completed game.",
    "createdAt": "2026-07-10T00:00:00.000Z"
  }
]
```

### play-session-members.json 예시

```json
[
  {
    "sessionId": "session-001",
    "memberId": "member-001"
  }
]
```

## 9. 코드 구조 계획

현재는 `script.js` 하나에 히어로 렌더링이 들어 있다. 다음 기능부터는 역할별로 분리한다.

목표 구조:

```text
src/
  main.js
  hero.js
  data.js
  local-data-source.js
  supabase-data-source.js
  map.js
  sessions.js
  progress.js
```

### 역할

- `main.js`: 앱 초기화
- `hero.js`: 현재 히어로 canvas/frame sequence 렌더링
- `data.js`: 데이터 접근 계약과 공통 상태 계산
- `local-data-source.js`: 로컬 JSON/localStorage 기반 mock adapter
- `supabase-data-source.js`: Supabase 기반 production adapter
- `map.js`: 보드게임 맵 렌더링과 게임 선택 UI
- `sessions.js`: 세션 등록 폼과 저장소 호출
- `progress.js`: 진척률, 상위 게임, 멤버별 통계 계산

### 분리 기준

- 히어로 효과 수정은 `hero.js` 안에서 끝나야 한다.
- 게임 데이터 계산은 DOM을 직접 만지지 않는다.
- 맵 렌더링은 데이터 결과만 받아서 그린다.
- Supabase 전환 시 UI 파일을 크게 바꾸지 않도록 data source를 교체하는 방식으로 간다.
- DB write가 필요한 기능은 처음부터 async 함수로 작성한다.

## 10. 개발 단계

### Phase 0: DB 계약 수립

목표:

- Boardmap MVP에 필요한 테이블과 관계 확정
- 로컬 mock과 Supabase가 공유할 data access contract 확정
- 플레이 횟수 기반 `locked`, `bronze`, `silver`, `gold` 계산 규칙 확정
- 157종 보드게임을 여러 맵/지역에 나눠 배치할 수 있는 구조 확정

완료 기준:

- `BoardmapDataSource` 함수 계약이 문서에 정의됨
- `maps`, `map_regions`, `board_games`, `board_game_locations`, `members`, `play_sessions`, `play_session_members` 관계가 확정됨
- UI에서 직접 JSON/localStorage/Supabase를 호출하지 않는 원칙이 확정됨

### Phase 0.5: Hero to Map Transition

목표:

- 히어로 섹션을 끝까지 스크롤했을 때만 맵 진입 링크를 노출한다.
- 진입 링크를 누르면 히어로 아래의 World Atlas 섹션으로 부드럽게 이동한다.
- World Atlas 섹션은 처음부터 스크롤만으로 노출되지 않아야 한다. 사용자가 진입 링크를 눌렀을 때 열리는 구조로 둔다.
- 데모용 `flow`, `arrival` 섹션은 실제 Boardmap 흐름과 맞지 않으므로 World Atlas 섹션으로 교체한다.
- World Atlas 섹션은 `assets/map/world-atlas-hub-v2.png`를 사용한다.

이번에 할 것:

- 히어로 완료 상태를 스크롤 진행률로 계산한다.
- 완료 상태에서만 CTA를 표시한다.
- CTA 클릭 시 숨겨져 있던 World Atlas 섹션을 열고 `#world-map`으로 이동한다.
- World Atlas 이미지를 첫 맵 화면으로 렌더링한다.

이번에 하지 않을 것:

- 157개 보드게임 노드 배치
- 지역별 상세 맵 이동
- 플레이 세션 등록
- DB-shaped JSON 데이터 로딩

완료 기준:

- 히어로 진행률이 끝에 가까워지기 전에는 맵 진입 링크가 보이지 않는다.
- 히어로 진행률이 끝에 도달하면 맵 진입 링크가 보인다.
- 링크를 누르기 전에는 일반 스크롤만으로 World Atlas 허브 맵이 노출되지 않는다.
- 링크를 누르면 `#world-map` 섹션으로 이동한다.
- World Atlas 허브 이미지가 데스크톱과 모바일에서 잘리지 않고 주요 지역이 보인다.

### Phase 0.6: World Atlas to Region Map Navigation

목표:

- World Atlas 허브 맵의 각 지역을 클릭하면 해당 Region Map으로 이동한다.
- 허브 이미지는 그대로 유지하고, 클릭 가능한 영역은 보이지 않는 HTML 버튼 오버레이로 구현한다.
- 상세 Region Map은 이미 생성된 `assets/map/regions/*.png` 이미지를 사용한다.

이번에 할 것:

- 허브 맵 위에 6개 지역 클릭 영역을 올린다.
- 클릭 영역은 `data-region` 값으로 지역 ID를 가진다.
- 지역 클릭 시 상세 Region Map 패널을 열고 해당 지역 이미지와 제목을 표시한다.
- 상세 Region Map에서 다시 World Atlas로 돌아갈 수 있게 한다.

이번에 하지 않을 것:

- Region Map 안에 157개 보드게임 노드 배치
- 지역별 게임 목록 연결
- 지역 이동 애니메이션 고도화
- DB-shaped JSON 데이터 로딩

완료 기준:

- Strategy Plains 클릭 시 `strategy-plains.png`가 표시된다.
- Engine Highlands 클릭 시 `engine-highlands.png`가 표시된다.
- Route & Territory Coast 클릭 시 `route-territory-coast.png`가 표시된다.
- Social Isles 클릭 시 `social-isles.png`가 표시된다.
- Wagering Port 클릭 시 `wagering-port.png`가 표시된다.
- Mystery District 클릭 시 `mystery-district.png`가 표시된다.
- 지역 클릭 전에는 상세 Region Map 패널이 보이지 않는다.

### Phase 0.7: 157 Board Games to Region Nodes

목표:

- CSV의 157종 보드게임을 모두 하나의 보드게임 노드와 1대1로 매칭한다.
- 각 보드게임은 정확히 하나의 Region Map에 배치한다.
- 각 노드는 `board_games.id`와 `board_game_locations.gameId`로 연결된다.
- 최초 `auto-v1` 자동 좌표는 폐기했고, 현재는 실제 원형 패드 중심에 맞춘 `pad-aligned-v1` 좌표를 사용한다.

이번에 할 것:

- `보드게임_157종.csv`를 읽어 `assets/data/board-games.json`으로 변환한다.
- 지역 배정 결과를 `assets/data/board-game-locations.json`에 저장한다.
- 정적 페이지에서 바로 사용할 수 있도록 `assets/data/boardmap-data.js`를 생성한다.
- Region Map을 열면 해당 지역에 배정된 보드게임 노드를 모두 렌더링한다.
- 노드 클릭 시 보드게임명, 장르, 테마, 추천 인원, 게임 시간, 난이도를 표시한다.

지역 자동 배정 원칙:

1. `추리`, `머더미스터리`, `방탈출` 중심 게임은 `mystery-district`에 배치한다.
2. `베팅`, `예측`, `경매`, `경마` 성격이 강한 게임은 `wagering-port`에 배치한다.
3. `마피아`, `협상`, 순수 `심리` 중심 게임은 `social-isles`에 배치한다.
4. 길 연결, 영역, 배치, 타일, 지도, 이동, 추격 키워드가 강한 게임은 `route-territory-coast`에 배치한다.
5. 빌드업, 운영, 자원, 주식, 건설, 농사, 엔진, 고난도 전략 게임은 `engine-highlands`에 배치한다.
6. 그 외 입문/카드/세트/추상 전략 게임은 `strategy-plains`에 배치한다.

이번에 하지 않을 것:

- 새 맵 이미지에 맞춘 추가 수동 좌표 보정
- 실제 플레이 세션 입력과 등급 변경
- DB/Supabase 연결
- 지역별 필터와 검색

완료 기준:

- `board-games.json`의 게임 수가 157개다.
- `board-game-locations.json`의 위치 수가 157개다.
- 모든 `board_games.id`는 정확히 하나의 `board_game_locations.gameId`와 매칭된다.
- `placementStatus = "placed"`인 위치는 모두 `x`, `y`가 0-100 범위 안에 있다.
- 6개 Region Map을 열었을 때 각 지역에 배정된 노드가 화면에 표시된다.

### Phase 0.8: Fullscreen Map Layout

목표:

- 히어로 섹션처럼 허브 맵과 Region Map도 화면을 꽉 채우는 풀스크린 스테이지로 보이게 한다.
- 맵 이미지는 카드 안에 들어간 이미지가 아니라, 화면 전체를 차지하는 기본 배경 경험이어야 한다.
- 제목, 설명, 뒤로가기, 게임 상세 정보는 맵 위에 오버레이로 올린다.

이번에 할 것:

- World Atlas 허브를 `100svh` 높이의 `atlas-stage`로 구성한다.
- 허브 이미지는 화면 높이를 기준으로 꽉 차게 표시하고, 좁은 화면에서는 가로 스크롤/팬이 가능하게 한다.
- Region Map도 `100svh` 높이의 풀스크린 `region-view`로 구성한다.
- 보드게임 노드는 Region Map 이미지 위에 그대로 유지한다.
- 게임 상세 패널은 Region Map 아래가 아니라 화면 하단 오버레이로 표시한다.

이번에 하지 않을 것:

- 맵 이미지 자체 재생성
- 노드 좌표 재배치
- 지역 전환 애니메이션 고도화

완료 기준:

- World Atlas가 진입 직후 첫 화면을 거의 전부 차지한다.
- Region Map을 열면 해당 맵이 한 화면을 거의 전부 차지한다.
- 모바일에서도 맵이 작은 카드처럼 보이지 않고, 화면 높이를 기준으로 크게 보인다.
- 노드 클릭 상세 정보가 맵 아래로 밀려나지 않고 오버레이로 표시된다.

### Phase 0.9: Minimal Map Overlay Text

목표:

- 허브맵과 Region Map에서 큰 제목이 맵을 가리지 않도록 한다.
- 텍스트는 좌상단의 작은 정보 오버레이로만 표시한다.
- 설명문은 유지하되, 화면을 많이 차지하지 않도록 한 줄 또는 짧은 문장 폭으로 줄인다.

이번에 할 것:

- World Atlas의 큰 `Boardmap` 제목은 화면에서 숨긴다.
- Region Map의 큰 지역 제목도 화면에서 숨긴다.
- 허브맵과 Region Map 모두 `eyebrow + description`만 작은 좌상단 텍스트로 보여준다.
- 텍스트 오버레이 위치를 더 위쪽으로 올려 맵 노출 면적을 늘린다.

완료 기준:

- 허브맵 진입 시 큰 제목이 맵을 덮지 않는다.
- Region Map 진입 시 큰 지역 제목이 맵을 덮지 않는다.
- 설명 텍스트는 좌상단에 작게 표시되고, 주요 맵 지형을 가리지 않는다.

### Phase 0.10: Locked Board Game Slots

목표:

- Region Map의 각 보드게임 노드가 작은 클릭 포인트가 아니라, 맵 위에 배치된 보드게임 칸처럼 보여야 한다.
- 아직 플레이하지 않은 보드게임은 회색 원형 슬롯으로 표시한다.
- 슬롯은 내부 원, 외곽 테두리, 클릭 패딩이 모두 보이도록 만들어 "아직 해금 안 된 칸"으로 읽히게 한다.

이번에 할 것:

- `game-node` 버튼 자체를 큰 원형 슬롯으로 키운다.
- 버튼 안에 `game-node__slot`, `game-node__label` 구조를 넣어 클릭 영역과 시각 영역이 일치하게 한다.
- `locked` 상태는 회색 내부 원과 밝은 외곽 링으로 표시한다.
- `bronze`, `silver`, `gold` 상태는 같은 슬롯 구조 위에 색만 바꿀 수 있게 둔다.

완료 기준:

- Region Map에서 노드가 맵 전체에 명확한 회색 원형 칸으로 보인다.
- 회색 칸 전체가 클릭 가능하다.
- 아직 세션 데이터가 없으므로 현재 157개 노드는 모두 `locked` 슬롯으로 보인다.

### Phase 0.11: Canvas Hitmap Node Layer

목표:

- CSS로 보드게임 노드를 배치하는 방식을 중단한다.
- Region Map 이미지와 같은 해상도/좌표계를 가진 canvas 레이어를 사용한다.
- 사용자가 보는 상태 슬롯과 컴퓨터가 읽는 클릭 판정 레이어를 분리한다.

레이어 구조:

1. `regionImage`: 사용자가 보는 Region Map 이미지
2. `nodeStateCanvas`: 사용자가 보는 locked/bronze/silver/gold 상태 슬롯
3. `hitMapCanvas`: 사용자에게 보이지 않는 클릭 판정용 canvas

구현 원칙:

- `nodeStateCanvas`와 `hitMapCanvas`는 Region Map 원본 이미지와 같은 1536x1024 좌표계를 사용한다.
- `board-game-locations.json`의 `x`, `y`는 이 canvas 좌표계의 퍼센트 값으로 해석한다.
- 클릭 시 CSS 버튼을 찾지 않고, 클릭 좌표를 `hitMapCanvas` 픽셀로 환산해 고유 색상을 읽는다.
- 읽은 색상을 `gameId`로 매핑해 상세 패널을 연다.
- 상태 표현은 이미지에 굽지 않고 `nodeStateCanvas`에 다시 그린다.

완료 기준:

- 보드게임 노드 DOM 버튼을 맵 위에 직접 배치하지 않는다.
- 클릭 판정은 보이지 않는 히트맵 canvas에서 수행한다.
- 상태 슬롯은 보이는 canvas에 그려지고, Region Map과 동일하게 스케일/스크롤된다.

### Phase 1: 문서와 데이터 뼈대

목표:

- SRR 기준을 개발 계획에 반영
- 로컬 데이터 파일 추가
- 보드게임, 멤버, 세션의 최소 샘플 데이터 작성
- 실제 DB 구조와 같은 관계형 mock data 작성
- `보드게임_157종.csv`를 DB-shaped JSON으로 변환할 준비

완료 기준:

- `assets/data/maps.json`
- `assets/data/map-regions.json`
- `assets/data/board-games.json`
- `assets/data/board-game-locations.json`
- `assets/data/members.json`
- `assets/data/play-sessions.json`
- `assets/data/play-session-members.json`
- 데이터 모델이 이 문서와 일치
- 157종 게임이 모두 `board-games.json`에 들어감
- 아직 좌표가 정해지지 않은 게임은 `board-game-locations.json`에서 `unplaced`로 표시됨

### Phase 2: 맵 UI 1차 구현

목표:

- 히어로 아래에 Boardgame Map 섹션 추가
- 각 보드게임을 맵 노드로 표시
- 누적 플레이 횟수에 따라 `locked`, `bronze`, `silver`, `gold` 상태 표시
- 게임 선택 시 상세 패널 표시

완료 기준:

- 게임 노드가 `board-games.json` 기준으로 렌더링됨
- 노드 좌표는 `board-game-locations.json` 기준으로 렌더링됨
- `placementStatus = "unplaced"` 게임은 맵 노드가 아니라 미배치 목록에 표시됨
- 세션 데이터가 없는 게임은 `locked` 상태가 됨
- 플레이 1-4회 게임은 `bronze` 상태가 됨
- 플레이 5-9회 게임은 `silver` 상태가 됨
- 플레이 10회 이상 게임은 `gold` 상태가 됨
- 모바일에서 노드 선택이 가능함

### Phase 3: 진척률과 미플레이 목록

목표:

- 전체 진척률 표시
- 잠겨 있는 게임 목록 표시
- 브론즈/실버/골드 개수 표시
- 가장 많이 플레이된 게임 표시

완료 기준:

- M002, M005, S003 충족
- 세션 데이터 변경 시 집계 결과가 갱신됨
- 진척률은 `bronze` 이상 게임 수를 기준으로 계산됨

### Phase 4: 세션 등록 프로토타입

목표:

- Developer Console에서 날짜, 게임명, 함께 플레이한 멤버 전원을 선택해 세션을 등록
- 맵 화면은 세션과 게임 정보를 조회만 하며 입력·수정 기능을 제공하지 않음
- 등록 결과를 localStorage data source에 저장
- 초기 구현에서는 localStorage adapter가 DB-shaped record로 저장
- 저장 직후 UI 갱신

완료 기준:

- 게임 제목, 플레이 날짜, 최소 한 명 이상의 등록 멤버 필수값 검증
- 세션 추가 및 기존 세션 수정 가능
- 새로고침 후에도 임시 저장된 세션 유지
- 선택한 멤버별 `play_session_members` 관계 레코드 저장
- 필수값 누락 시 등록되지 않음

### Phase 5: 멤버별 이력

목표:

- 멤버 선택 시 참여 이력 표시
- 멤버별 참여 횟수 표시

완료 기준:

- M004 충족
- 멤버별 최근 플레이 기록 표시
- Developer Console에서 멤버 추가·수정·삭제 가능
- 멤버별 플레이 날짜와 게임 제목 조회 가능

### Phase 6: Supabase 전환

목표:

- `localBoardmapDataSource`를 `supabaseBoardmapDataSource`로 교체
- public read, authenticated write 적용
- 멤버 인증 도입

완료 기준:

- 인증 없이 조회 가능
- 인증된 멤버만 세션 등록 가능
- 데이터가 원격 DB에 영속 저장됨
- 맵/진척률/멤버 이력 UI는 data source 교체 외 큰 수정 없이 유지됨
- M009 충족

### Phase 7: 보상/오브젝트 SDR 작성

목표:

- 보상, 오브젝트, 잠금 해제 콘텐츠를 별도 SDR로 설계
- 현재 MVP 데이터와 어떻게 연결할지 정의

완료 기준:

- M006, M007, M010을 실제 구현 가능한 설계로 재정의
- 구현 전 `DEVELOPMENT_PLAN.md` 갱신

## 11. Supabase 전환 설계

Supabase는 "나중에 붙이는 부가 기능"이 아니라 Boardmap의 영속 저장 계층이다. 로컬 프로토타입은 Supabase 도입 전 UX와 화면 흐름을 빠르게 확인하기 위한 mock일 뿐이며, 모든 데이터 구조는 Supabase 전환을 기준으로 작성한다.

### 선택 이유

- 모바일 웹에서 인증과 DB를 빠르게 붙일 수 있다.
- Postgres 기반이라 관계형 데이터에 적합하다.
- public read와 authenticated write 정책을 RLS로 나눌 수 있다.
- 나중에 사진 업로드가 필요하면 Supabase Storage를 붙일 수 있다.

### 예상 테이블

```sql
maps                       -- 맵 원장
map_regions                -- 맵 안의 구역
board_games                -- 보드게임 원장
board_game_locations       -- 보드게임과 맵 좌표 관계
members                    -- 소모임 멤버
play_sessions              -- 플레이 1회 기록
play_session_members       -- 플레이 세션 참여 멤버 관계
reward_ledger              -- future
member_unlocks             -- future
```

### MVP 테이블 초안

```sql
create table maps (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  image_url text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table map_regions (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references maps(id) on delete cascade,
  slug text not null,
  title text not null,
  genre_key text,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (map_id, slug)
);

create table board_games (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  primary_genre text not null,
  genres text[] not null default '{}',
  theme text,
  sort_order integer not null default 0,
  bgg_id text,
  min_players integer,
  max_players integer,
  play_time_minutes integer,
  difficulty text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table board_game_locations (
  game_id uuid primary key references board_games(id) on delete cascade,
  map_id uuid references maps(id) on delete set null,
  region_id uuid references map_regions(id) on delete set null,
  map_x numeric check (map_x >= 0 and map_x <= 100),
  map_y numeric check (map_y >= 0 and map_y <= 100),
  placement_status text not null default 'unplaced'
    check (placement_status in ('placed', 'unplaced', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    placement_status <> 'placed'
    or (map_id is not null and map_x is not null and map_y is not null)
  )
);

create table members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  avatar_url text,
  active boolean not null default true,
  auth_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table play_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references board_games(id) on delete restrict,
  played_at date not null,
  note text,
  created_by uuid references members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table play_session_members (
  session_id uuid not null references play_sessions(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  result text,
  score numeric,
  primary key (session_id, member_id)
);
```

### 파생 view 초안

게임 노드 상태는 세션 수에서 계산한다.

```sql
create view game_progress as
select
  bg.id as game_id,
  count(ps.id)::integer as play_count,
  max(ps.played_at) as last_played_at,
  count(distinct psm.member_id)::integer as participant_count,
  case
    when count(ps.id) >= 10 then 'gold'
    when count(ps.id) >= 5 then 'silver'
    when count(ps.id) >= 1 then 'bronze'
    else 'locked'
  end as status
from board_games bg
left join play_sessions ps on ps.game_id = bg.id
left join play_session_members psm on psm.session_id = ps.id
group by bg.id;
```

로컬 `getGameProgress()`도 이 view와 같은 shape를 반환해야 한다.

### 권한 정책

- `board_games`: 누구나 읽기 가능, 관리자만 쓰기
- `members`: 누구나 읽기 가능, 본인 또는 관리자만 수정
- `play_sessions`: 누구나 읽기 가능, 인증 멤버만 생성
- `play_session_members`: 누구나 읽기 가능, 세션 생성자 또는 관리자만 수정
- `reward_ledger`: 누구나 읽기 가능 여부는 SDR에서 결정
- `member_unlocks`: 멤버별 조회/공개 범위는 SDR에서 결정

### RLS 원칙

- 조회 정책은 공개로 시작한다. 인증 없이도 맵과 진척 현황을 볼 수 있어야 하기 때문이다.
- 쓰기 정책은 인증된 멤버로 제한한다.
- `auth.users.id`와 `members.auth_user_id`를 연결해 현재 로그인 사용자가 소모임 멤버인지 확인한다.
- 관리 기능은 처음에는 DB seed 또는 관리자 콘솔에서만 처리하고, 웹 UI에는 노출하지 않는다.

### 환경 변수

Supabase 전환 시 필요한 값:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

정적 사이트에서 anon key는 노출될 수 있으므로, 보안은 anon key 숨김이 아니라 RLS 정책으로 보장한다.

### 전환 순서

1. 로컬 mock data와 `BoardmapDataSource` 계약을 먼저 완성한다.
2. Supabase 프로젝트를 만든다.
3. MVP 테이블과 `game_progress` view를 생성한다.
4. 로컬 JSON 데이터를 seed SQL 또는 import script로 넣는다.
5. `supabase-data-source.js`를 작성한다.
6. `main.js`에서 data source만 교체한다.
7. public read가 인증 없이 동작하는지 확인한다.
8. authenticated write로 세션 등록이 되는지 확인한다.

## 12. UI/UX 원칙

### 맵 제작 방식

CSS만으로 최종 맵을 만드는 방식은 권장하지 않는다. CSS는 노드, 패널, 필터, 상태 표시에는 적합하지만, 지형감 있는 보드게임 월드맵을 만들기에는 표현력과 유지보수 측면에서 한계가 크다.

권장 방식:

```text
generated raster map background
+ normalized coordinate node layer
+ HTML/SVG interaction overlay
+ data-driven status styling
```

구성:

- `map background`: 직접 생성하거나 편집한 하나의 큰 래스터 이미지
- `node layer`: 각 보드게임의 `mapX`, `mapY` 좌표에 배치되는 HTML/SVG 버튼
- `status layer`: `locked`, `bronze`, `silver`, `gold` 상태에 따른 색상, 테두리, 광원, 배지
- `interaction layer`: hover, tap, selected state, detail panel 연결
- `data layer`: `board_games`와 `game_progress` 데이터를 기반으로 노드 렌더링

이 방식을 선택하는 이유:

- 맵 이미지는 풍부한 분위기를 만들 수 있다.
- 노드는 실제 데이터와 1대1로 대응시킬 수 있다.
- 맵을 다시 그리거나 교체해도 `mapX`, `mapY` 좌표만 조정하면 된다.
- CSS-only보다 시각적 완성도가 높고, canvas-only보다 접근성과 UI 구현이 쉽다.
- 모바일에서도 노드 hit area와 상세 패널을 안정적으로 제어할 수 있다.

가능한 맵 제작 흐름:

1. Boardmap의 톤에 맞는 월드맵 이미지를 생성한다.
2. 이미지 안에 주요 구역을 만든다. 예: 초원, 항구, 산, 도시, 숲, 사막, 유적
3. 보드게임 목록을 각 구역의 노드로 배치한다.
4. 각 노드 좌표를 `board_games.mapX`, `board_games.mapY`로 저장한다.
5. 브라우저에서는 배경 이미지를 깔고, 노드를 좌표 기반으로 올린다.
6. 플레이 세션 집계 결과에 따라 노드 상태를 갱신한다.

맵 이미지는 직접 생성할 수 있다. 생성 후에는 다음 방식으로 조절한다.

- 첫 생성 이미지는 분위기와 구역 구조를 잡는 용도로 사용한다.
- 실제 서비스에서는 노드를 이미지에 박아 넣지 않는다.
- 노드는 HTML/SVG로 별도 렌더링한다.
- 이미지 위의 빈 공간, 시선 흐름, 모바일 crop을 보고 노드 좌표를 조정한다.
- 필요하면 같은 스타일로 2-3개 버전을 생성해 가장 읽기 좋은 구도를 선택한다.

현재 생성된 World Atlas 허브 맵:

- 파일: `assets/map/world-atlas-hub-v2.png`
- 용도: 6개 Region Map으로 진입하는 실제 허브 맵 기준안
- 특징: 초원, 산지, 해안 루트, 등불 섬, 항구, 밤의 도시가 자연 지형과 랜드마크로 구분되어 있다.
- 사용 원칙: 이미지 자체에는 큰 노드나 버튼형 마커를 넣지 않는다. 각 지역 위에 보이지 않는 HTML/SVG 클릭 오버레이를 올린다.
- 진행률 배지가 필요하면 지역 중앙을 가리지 않는 작은 UI로 별도 렌더링한다.
- 다음 확인 사항: 모바일 세로 화면에서 각 구역 클릭 영역이 충분히 크게 유지되는지 확인한다.

현재 생성된 Region Map 후보:

| 맵 ID | 파일 | 용도 |
| --- | --- | --- |
| `strategy-plains` | `assets/map/regions/strategy-plains.png` | 전략 게임 중 입문/카드/세트/추상 계열 |
| `engine-highlands` | `assets/map/regions/engine-highlands.png` | 빌드업/운영/자원/경제 계열 |
| `route-territory-coast` | `assets/map/regions/route-territory-coast.png` | 길 연결/영역/배치/타일 계열 |
| `social-isles` | `assets/map/regions/social-isles.png` | 심리/마피아/협상/파티 계열 |
| `wagering-port` | `assets/map/regions/wagering-port.png` | 베팅/예측/경매/거래 계열 |
| `mystery-district` | `assets/map/regions/mystery-district.png` | 추리/머더미스터리/방탈출 계열 |

이전 시안 `assets/map/boardmap-world-v1.png`는 실제 허브 역할에 맞지 않아 삭제했다. `assets/map/world-atlas-hub-v1.png`도 큰 노드/패드처럼 보이는 구성이 있어 삭제하고, 실제 허브 맵은 `assets/map/world-atlas-hub-v2.png`를 기준으로 사용한다.

대안 비교:

| 방식 | 장점 | 단점 | 판단 |
| --- | --- | --- | --- |
| CSS-only map | 빠르고 가벼움 | 지형/분위기 표현이 빈약함, 복잡해질수록 유지보수 어려움 | 초기 wireframe까지만 사용 |
| generated image + HTML/SVG nodes | 분위기와 데이터 인터랙션을 모두 잡을 수 있음 | 이미지 생성/좌표 조정 과정 필요 | MVP 추천 방식 |
| pure SVG map | 확대/상태 제어가 좋음 | 손으로 지형을 만들기 어렵고 시각 완성도 확보가 느림 | 단순한 전략맵일 때만 고려 |
| canvas full map | 자유도가 높음 | 접근성/클릭/반응형/패널 UI 구현 비용이 큼 | 게임처럼 복잡해진 후 고려 |

주의사항:

- 노드가 배경 이미지의 일부가 되면 안 된다. 상태 변경과 클릭 처리가 어려워진다.
- 보드게임 이름을 배경 이미지에 직접 넣지 않는다. 텍스트는 DOM으로 렌더링한다.
- 모바일에서는 전체 맵을 축소해서 모든 노드를 작게 만드는 것보다, 구역별 스크롤 또는 확대 가능한 구조를 고려한다.
- `locked` 상태도 너무 안 보이면 안 된다. 잠긴 게임은 "목표"로 보여야 한다.

### 맵

- 맵은 장식용 배경이 아니라 실제 게임 목록의 시각화여야 한다.
- 각 노드는 반드시 하나의 보드게임과 대응되어야 한다.
- `locked`, `bronze`, `silver`, `gold` 상태가 색, 밝기, 테두리, 라벨 중 최소 두 가지 방식으로 구분되어야 한다.
- 모바일에서 작은 노드를 터치하기 어렵지 않게 충분한 hit area를 둔다.

### 텍스트

- 기능 설명을 길게 노출하지 않는다.
- 상태와 결과 중심으로 짧게 보여준다.
- 모바일에서 줄바꿈이 깨지지 않아야 한다.

### 색상

- 현재 히어로의 부드러운 하늘/초록/크림 톤과 연결한다.
- 단일 초록 계열만 반복하지 않는다.
- 완료 상태와 미완료 상태의 대비를 명확히 한다.

## 13. 검증 체크리스트

### 코드 검증

```powershell
node --check script.js
```

모듈 분리 후에는 각 JS 파일도 함께 검사한다.

### 데이터 검증

- 모든 `play_sessions.gameId`가 실제 `board_games.id`를 참조하는지 확인
- 모든 `board_game_locations.gameId`가 실제 `board_games.id`를 참조하는지 확인
- 모든 `board_game_locations.mapId`가 실제 `maps.id`를 참조하는지 확인
- 모든 `board_game_locations.regionId`가 실제 `map_regions.id`를 참조하는지 확인
- 모든 `play_session_members.memberId`가 실제 `members.id`를 참조하는지 확인
- 모든 `play_session_members.sessionId`가 실제 `play_sessions.id`를 참조하는지 확인
- `board_games.id` 중복이 없는지 확인
- `placementStatus = "placed"`인 항목은 `mapX`, `mapY`가 0-100 범위 안에 있는지 확인
- 157종 CSV import 이후 `board_games` 개수가 157개인지 확인

### 화면 검증

- 데스크톱에서 히어로가 비어 있지 않은지 확인
- 모바일에서 히어로 텍스트가 잘리지 않는지 확인
- 맵 노드가 화면 밖으로 나가지 않는지 확인
- `locked`, `bronze`, `silver`, `gold` 상태가 명확히 구분되는지 확인
- 게임 상세 패널이 모바일에서 사용 가능한지 확인
- 세션 등록 후 진척률이 즉시 바뀌는지 확인
- 세션 등록 후 해당 게임 노드 등급이 즉시 갱신되는지 확인

### SRR 검증

각 Phase가 끝날 때 아래 항목을 체크한다.

- M001: 게임별 플레이 완료 여부 조회 가능
- M002: 전체 진척률 표시 가능
- M003: 날짜, 게임명, 멤버 입력 기반 세션 등록 가능
- M004: 멤버별 참여 이력 조회 가능
- M005: 잠겨 있는 게임 목록 표시 가능
- M008: 모바일 브라우저 정상 동작

M006, M007, M010은 보상/오브젝트 SDR 이후 검증한다.

## 14. Git 운영 방식

### 기본 브랜치

- `main`

### 커밋 단위

권장 커밋 메시지:

- `Document boardmap MVP plan`
- `Add local boardgame data`
- `Render boardgame map`
- `Add play session form`
- `Add progress summary`
- `Add member history view`
- `Connect Supabase data layer`

### 커밋 전 확인

```powershell
git status --short
node --check script.js
```

## 15. 현재 열려 있는 결정 사항

아래 항목은 구현 전에 확정하거나, 임시값으로 시작한 뒤 문서에 기록한다.

- 초기 보드게임 목록을 몇 개로 시작할 것인가
- 157종 전체를 한 번에 import할 것인가, 우선 30-40개 샘플로 맵 배치 UX를 검증할 것인가
- 실제 소모임 멤버 목록을 넣을 것인가, 샘플 멤버로 시작할 것인가
- 맵 노드 위치를 수동 배치할 것인가, 자동 그리드로 시작할 것인가
- 인증은 Supabase magic link로 할 것인가, GitHub/Google OAuth로 할 것인가
- 세션 결과 입력은 텍스트로만 둘 것인가, 점수/승자 구조를 둘 것인가
- Supabase 프로젝트를 지금 바로 만들 것인가, 로컬 mock adapter 완성 후 만들 것인가
- DB column naming은 snake_case로 고정하고 JS adapter에서 camelCase로 변환할 것인가
- Strategy 장르 82개를 어떤 하위 맵으로 나눌 것인가

## 16. 당장 다음 작업

다음 작업은 `pad-aligned-v1` 노드의 실제 사용성을 확인하고, 플레이 세션 데이터와 연결하는 방향으로 진행한다.

1. 각 Region Map에서 157개 노드의 시각적 밀도와 터치 가능성을 확인한다.
2. Social Isles 배경에서 실제 노드로 인정하는 위치는 사용자 표시 이미지의 파란색 원 33개뿐이다. 초과 게임은 임의 위치에 표시하지 않고 `unplaced`로 유지하며, 맵 확장 또는 하위 지역 추가 시 새 노드에 배치한다.
3. `board-game-locations.json`의 `pad-aligned-v1` 좌표 중 실제 이미지 패드와 어긋나는 지점을 화면 기준으로 보정한다.
4. 세션 등록 프로토타입을 만들기 전에 `play-sessions.json`, `play-session-members.json` write adapter 구조를 정한다.
5. `locked`, `bronze`, `silver`, `gold` 상태가 실제 세션 수에 따라 바뀌는 샘플 데이터를 추가할지 결정한다.

## 17. 변경 기록

- 2026-07-11: 구름 영상이 독립된 사각 레이어처럼 보이던 원인인 `.cloud-transition { isolation: isolate; }`를 제거했다. 전환 컨테이너를 투명하게 두고 MP4의 검정을 `screen` 모드로 실제 페이지 배경과 직접 합성한다. 2.5초에 뒤 화면만 교체되며 앞쪽 구름 영상은 계속 재생되어 걷히는 구름 사이로 새 화면이 직접 드러난다.
- 2026-07-11: 구름 전환 중앙에서 모션이 끊겨 보이던 원인인 보조 veil과 알파 WebM 변환을 제거했다. 새 영상은 순검정 배경이므로 원본 H.264 MP4를 `screen` 합성해 검정만 투명 처리하고, 5.04초 영상을 중단 없이 1× 재생한다. 구름이 완전히 덮인 2.5초 시점에 별도 레이어 없이 화면 상태만 교체하고 나머지 2.54초의 구름 소멸 장면을 그대로 보여준다.
- 2026-07-11: 새 5.04초 Kling 구름 영상을 기반으로 transition alpha WebM을 교체했다. 순검정 배경만 `colorkey(0x000000, similarity 0.16, blend 0.08)`로 제거해 구름 본체와 내부 회색 음영은 불투명하게 보존했다. 영상을 1× 속도로 전부 재생하며 2.0초부터 veil을 덮고 2.3초 완전 차폐 시점에 화면을 교체한 뒤 2.6초부터 veil을 걷어 영상 자체의 구름 소멸 과정으로 다음 화면을 공개한다.
- 2026-07-11: 전환 구름이 반투명하고 일부 브라우저에서 검정 프레임이 보이던 문제를 재보정했다. 알파 임계값을 명도 132, 기울기 7.5로 높여 구름 본체를 불투명하게 만들고 RGB를 중성 회색 구름으로 정리했다. VP9 알파 미지원 시에도 검정이 사라지도록 `screen` 합성을 백업으로 적용했으며, 구름 뒤 안개 veil이 300ms 동안 opacity 1에 도달한 정확한 시점(재생 1초)에 화면을 교체하고 이후 300ms 동안 걷히도록 수정했다.
- 2026-07-11: 알파가 없던 Kling MP4를 명도 기반 알파 마스크로 변환해 VP9 WebM `cloud-transition-alpha.webm`을 생성했다. 명도 145 이하는 투명하게 제거하고 145–225 범위는 3.2배 기울기의 부드러운 알파로 변환해 구름만 남겼다. HTML 소스를 실제 alpha WebM으로 교체하고 `mix-blend-mode: screen`을 제거해 사각 영상 프레임과 푸른 배경이 보이던 문제를 해결했다.
- 2026-07-11: ElevenLabs Kling 전환 영상을 `assets/video/cloud-transition.mp4`로 추가하고 CSS 구름 bank/mist 애니메이션을 교체했다. 원본 MP4는 알파 없는 3840×2160 H.264 yuv420p 3.04초이므로 `mix-blend-mode: screen`으로 검정 배경을 제거하고 1.5× 재생해 약 2.04초 전환으로 사용한다. 화면 교체 전후 120ms 동안 불투명 veil을 적용해 영상의 푸른 배경 틈을 가린다.
- 2026-07-11: Kling 영상에서 Strategy Plains 풍차의 날개와 축이 변형되는 문제를 보정했다. 영상 위에 원본 `world-atlas-hub-v2.png`를 같은 크기로 겹치고 `17% 46%` 지점의 풍차 주변만 5.8%×10.5% 타원형 radial mask로 노출한다. 가장자리는 54–100% 구간에서 페더 처리해 정적 풍차 영역과 움직이는 들판이 자연스럽게 혼합된다.
- 2026-07-11: 동일한 ElevenLabs Kling 파일명으로 재생성된 허브 영상을 `world-atlas-hub-animated.mp4`에 반영했다. 새 파일은 3836×2160 H.264, 24fps, 6.04초, 19,807,015 bytes이며 기존 HTML 경로 변경 없이 교체된다.
- 2026-07-11: ElevenLabs Kling 3.0 Pro로 생성한 3836×2160 H.264 24fps 6초 영상을 `assets/map/world-atlas-hub-animated.mp4`로 추가하고 World Atlas 정적 배경을 autoplay/muted/loop/playsinline 영상으로 교체했다. 기존 이미지는 poster fallback으로 유지하며, 영상과 중복되던 atlas effects canvas 및 관련 JS 렌더링을 제거했다. 허브 비율은 영상에 맞춰 16:9로 변경했다.
- 2026-07-11: 원본 이미지의 원근과 맞지 않던 코드 기반 풍차·수차 회전과 인공 선박을 제거했다. 마을 불빛은 두 주기의 비동기 밝기 변화로 낮췄고, 실제 폭포 5곳에는 수증기 입자와 확산 포말을, 수로에는 짧고 낮은 알파의 잔물결을 배치해 원본 픽셀 위에서 자연스럽게 보이는 환경 효과 중심으로 재구성했다.
- 2026-07-11: World Atlas 정적 이미지 위에 1680×928 애니메이션 캔버스를 추가했다. Strategy Plains 풍차, Engine Highlands 수차 2개, Social Isles/Mystery District 마을 불빛, 해상 이동 선박과 물결 반사선을 저강도 오버레이로 렌더링한다. Atlas 화면에서만 동작하며 Region 진입 및 `prefers-reduced-motion` 환경에서는 렌더링을 중단한다.
- 2026-07-11: 게임 상세 패널 우측 상단에 원형 닫기 버튼을 추가했다. 선택된 게임 노드를 다시 클릭하는 경우에도 `hideGameDetail()`을 호출해 패널과 노드 선택 강조가 함께 닫히도록 토글 동작을 적용했다.
- 2026-07-11: World Atlas 하단의 `Replay Flight` 링크를 제거했다. Hero 복귀는 상단 `Flight` 및 `Boardmap` 내비게이션으로만 제공한다.
- 2026-07-11: 우측 상단 스크롤 진행률 미터를 Hero 전용 UI로 제한했다. `is-map-open` 상태의 World Atlas와 Region Map에서는 미터를 숨기고 Hero 복귀 시 다시 표시한다.
- 2026-07-11: 전환 타이틀의 완성 후 유지 시간을 2초에서 1초로 줄였다. 페이지 메모리의 `visitedDestinationTitles`에 방문한 Atlas/Region 이름을 기록해 새로고침 전까지 각 목적지의 최초 진입에서만 타이틀을 표시하고 재방문에서는 구름 전환만 실행한다. 초기 Hero의 `Boardmap`은 이미 방문한 화면으로 간주한다.
- 2026-07-11: 방사형 `background-clip`만으로 글자 끝까지 덮으려던 구조적 한계를 수정했다. 비선형 방사형 레이어와 별개로 동일한 전체 글자 실루엣을 `::after`에 두고, 두 레이어를 같은 2.4초 `linear` 타임라인으로 동시에 진행한다. 완전 채움 레이어가 처음부터 연속적으로 증가하므로 끊김 없이 모든 획의 최종 100% 채움을 보장한다.
- 2026-07-11: 전환 타이틀 채움이 중간에 멈추는 듯 보이던 단계형 키프레임과 후반 완성 레이어를 제거했다. 세 방사형 채움이 2.4초 동안 단일 `linear` 진행률로 처음부터 끝까지 연속 확장되도록 단순화하고 최종 범위를 넓혀 획 끝까지 채운다.
- 2026-07-11: 타이틀 채움 마지막 순간의 순백색 전환이 끊겨 보이던 문제를 수정했다. 방사형 채움과 동일한 글자 형태의 `::after` 완성 레이어를 겹치고 마지막 700ms 동안 opacity를 0→1로 올려 획 끝까지 자연스럽게 마감한다.
- 2026-07-11: 다중 방사형 타이틀 채움의 투명 페더가 글자 획 끝에 남던 문제를 수정했다. 96%까지 비선형 채움을 확장하고 100% 시점에 순백색 최종 레이어를 적용해 모든 획의 끝부분이 완전히 채워진 상태로 유지되도록 했다.
- 2026-07-11: 전환 타이틀의 내부 채움과 외곽선을 EverSwap WebGL 타이틀과 같은 순백색 `#FFFFFF`로 통일하고, 반응형 글자 크기를 `clamp(4rem, 12vw, 11rem)`으로 확대했다.
- 2026-07-11: EverSwap 메인 타이틀에 사용된 `FeatureDisplay-Extralight.woff2`를 `assets/fonts/`에 로컬 자산으로 추가하고, 구름 전환 목적지 타이틀에 동일한 `Feature Display` 200 weight를 적용했다.
- 2026-07-11: 전환 타이틀의 단방향 채움 와이프를 제거했다. 글자 내부의 좌측·중앙·우측 세 지점에서 서로 다른 크기와 속도로 방사형 채움이 퍼지도록 변경하고, 전체 등장 시간을 1초에서 2.4초로 늘려 EverSwap의 비선형 메시 등장 감각에 가깝게 조정했다.
- 2026-07-11: 맵 전환 타이틀의 내부 채움 효과를 EverSwap 방식에 더 가깝게 조정했다. 외곽선을 먼저 노출한 뒤 밝은 내부 면이 왼쪽에서 오른쪽으로 1초 동안 채워지도록 `background-clip: text` 기반 와이프를 적용했다.
- 2026-07-11: 구름 전환 순서를 `안개 덮기 → 목적지 화면 교체 → 안개 걷기 → 새 화면 위 타이틀 등장 → 2초 유지 → 타이틀 퇴장`으로 변경했다. 타이틀 표시 중에는 구름 오버레이가 새 화면 입력을 막지 않으며, 다양한 맵 배경에서 읽히도록 밝은 텍스트와 어두운 외곽선으로 조정했다.
- 2026-07-11: 구름 전환이 화면을 완전히 덮은 뒤 목적지 맵 이름을 중앙에 표시하도록 추가했다. EverSwap 메인 타이틀의 외곽선→내부 채움 방식을 CSS로 단순화해 재현하며, `World Atlas`, 각 Region Map 이름, Hero 복귀 시 `Boardmap`을 표시한 뒤 페이드아웃하고 새 화면을 공개한다.
- 2026-07-11: 버튼 기반 화면 전환에 구름 와이프 애니메이션을 추가했다. 양쪽 구름 레이어와 안개가 화면을 약 720ms 동안 덮은 뒤 중앙에서 화면 상태를 교체하고 약 820ms 동안 흩어진다. 전환 중 중복 입력을 차단하며 `prefers-reduced-motion` 환경에서는 애니메이션 없이 즉시 전환한다.
- 2026-07-11: Hero, World Atlas, Region Map을 문서 스크롤 구간이 아닌 버튼 기반 화면 상태로 분리했다. Atlas가 열리면 전체 화면 고정 오버레이와 body scroll lock을 적용하고, Region Map은 Atlas 내부의 절대 배치 화면으로 전환한다. Hero→Atlas, Atlas→Region, Region→Atlas, Atlas→Hero 이동은 각 진입·복귀 버튼으로만 가능하다.
- 2026-07-11: bronze/silver/gold 노드의 내부 타원 세로 반지름을 2px 줄여 안쪽 얇은 링과 외곽 링 사이의 위아래 여백을 소폭 늘렸다. 좌우 여백은 유지한다.
- 2026-07-11: bronze/silver/gold 노드 상단에서 흰 선처럼 보이던 타원형 반사광 스트로크를 제거했다. 금속색 그라데이션만으로 입체감을 표현한다.
- 2026-07-11: bronze/silver/gold 노드의 중앙 에나멜 영역을 각 등급의 금속색으로 채웠다. 외곽 링보다 약간 어두워지는 방사형 그라데이션을 적용해 전체가 등급 색으로 보이면서 입체감은 유지한다.
- 2026-07-11: bronze/silver/gold 노드의 어두운 에나멜 중앙에 있던 원형 포인트를 제거하고 금속 링과 상단 반사광만 유지했다.
- 2026-07-11: 지도 전반과 조화되는 등급 팔레트로 bronze는 저채도 로즈 코퍼, silver는 청회색 페일 실버, gold는 앤티크 샴페인 골드로 조정했다. 작은 노드가 다양한 지역 배경에서도 묻히지 않도록 공통 어두운 키라인과 다섯 단계 금속 명암을 적용했다.
- 2026-07-11: 플레이 전 `locked` 및 빈 노드는 초기 회색 이중 원형 슬롯 디자인으로 복원했다. 무광 금속 메달 스타일은 첫 플레이 이후 `bronze` 이상 상태에만 적용한다.
- 2026-07-11: Region Map의 등급 노드 디자인을 절제된 무광 금속 메달 스타일로 재조정했다. 강한 후광과 스파클을 제거하고 저채도 브론즈·실버·골드 금속 링, 어두운 에나멜 중심부, 얇은 이중 테두리와 미세한 반사광만 사용해 지도 위에서 고급스럽고 차분하게 구분되도록 했다.
- 2026-07-11: Play Sessions 멤버 선택 목록에서 체크박스와 이름이 한 줄로 정렬되도록 폼 공통 label 스타일의 충돌을 수정했다. `Session Members` 탭은 멤버 마스터와 구분하기 위해 세션-멤버 참여 관계를 뜻하는 `Session Participants`로 명칭을 변경했다.
- 2026-07-11: Developer Console에 로컬 멤버 CRUD와 멤버별 플레이 이력을 추가했다. Play Sessions 등록·수정 시 등록된 멤버를 복수 선택해야 하며 `playSessionMembers` 관계 레코드로 저장한다. Member History에서는 멤버를 선택해 플레이 날짜·게임 제목·전체 인원수·메모를 조회할 수 있고, 백업/복원 범위에 멤버 카탈로그도 포함한다.
- 2026-07-11: Developer Console의 플레이 세션 게임 선택을 스크롤·검색 겸용 콤보박스로 변경했다. 입력창 클릭 시 157개 게임 목록이 열리고 스크롤할 수 있으며, 제목 일부 입력 시 같은 목록이 실시간 필터링된다. 카탈로그에 존재하는 정확한 게임 제목만 저장할 수 있다.
- 2026-07-11: 플레이 세션 입력 권한을 개발자 콘솔로 한정했다. 맵의 세션 등록 폼을 제거하고, Developer Console의 Play Sessions 탭에서 게임 제목·플레이 날짜·인원수·메모를 추가하거나 수정하도록 변경했다. 저장 레코드는 `gameId` 관계를 유지하면서 테이블에는 실제 게임 제목을 표시하며, 기존 참여 관계 데이터가 있으면 인원수를 호환 계산한다.
- 2026-07-11: `developer.html` 개발자 콘솔을 추가했다. 번들 JSON 테이블과 브라우저 localStorage 레코드 현황을 조회하고 참조 무결성을 검사할 수 있으며, 로컬 세션의 개별 삭제·JSON 백업/복원·확인 문구 기반 전체 초기화를 지원한다. 기본 카탈로그 데이터는 읽기 전용으로 보호한다.
- 2026-07-11: Phase 3/4 1차 구현으로 전체 진행률·등급별 개수·최다 플레이 게임 요약을 추가하고, 게임 상세에서 날짜·참여 멤버·메모를 입력하는 localStorage 기반 세션 등록 어댑터를 연결했다. 세션과 참여 멤버 관계는 별도 키에 DB-shaped record로 저장되며 등록 직후 노드 등급과 진행 요약을 다시 계산한다.

- 2026-07-10: 157종 보드게임과 장르 분포를 고려해 World Atlas + Region Map 구조, map/location 분리 데이터 모델 추가
- 2026-07-10: 실제 사용 후보 Region Map 이미지 6장 생성
- 2026-07-10: Boardgame Map 배경 시안 `assets/map/boardmap-world-v1.png` 생성 및 문서 기록
- 2026-07-10: `boardmap-world-v1.png`는 실제 허브 맵으로 부족하다고 판단하고 별도 World Atlas 생성 필요로 변경
- 2026-07-10: 실제 허브용 `assets/map/world-atlas-hub-v1.png` 생성, 이전 `boardmap-world-v1.png` 삭제
- 2026-07-10: 허브 맵은 큰 노드 없이 지역 자체를 누르는 구조가 적합하다고 판단해 `world-atlas-hub-v1.png` 삭제 후 `assets/map/world-atlas-hub-v2.png`로 교체
- 2026-07-10: 맵 제작 방식을 CSS-only가 아닌 생성 이미지 배경 + HTML/SVG 데이터 노드 오버레이로 정의
- 2026-07-10: DB-first 개발 원칙, data source 계약, Supabase 테이블/view/RLS 전환 계획 추가
- 2026-07-10: 유저 관점의 게임 노드 해금 및 브론즈/실버/골드 등급 규칙 추가
- 2026-07-10: SRR을 반영해 Boardmap MVP 개발 계획으로 문서 재작성
- 2026-07-10: Phase 0.5로 히어로 완료 후 World Atlas 맵 진입 링크를 노출하는 흐름 정의 및 구현
- 2026-07-10: World Atlas가 일반 스크롤만으로 노출되지 않도록 숨김 상태로 두고, 히어로 완료 후 CTA 클릭 시 열리도록 수정
- 2026-07-10: Phase 0.6으로 World Atlas 허브 위 투명 클릭 영역 6개를 추가하고 각 Region Map 이미지로 이동하도록 구현
- 2026-07-10: Phase 0.7로 CSV 157종을 `board-games.json`과 `board-game-locations.json`에 1대1 매칭하고 Region Map 위에 노드 렌더링 구현
- 2026-07-10: Phase 0.8로 World Atlas와 Region Map을 카드형 이미지가 아닌 화면을 꽉 채우는 풀스크린 맵 스테이지로 수정
- 2026-07-10: Phase 0.9로 허브맵과 Region Map의 큰 제목을 숨기고 좌상단 소형 설명 오버레이로 축소
- 2026-07-10: Phase 0.10으로 보드게임 노드를 작은 클릭 점에서 회색 원형 잠김 슬롯 UI로 변경하고 슬롯 전체를 클릭 영역으로 수정
- 2026-07-10: 기존 `auto-v1` 격자 좌표를 폐기하고 각 Region Map의 실제 원형 패드 중심에 맞춘 `pad-aligned-v1` 좌표로 재작성
- 2026-07-10: `boardmap-data.js` 생성 과정에서 배열이 `{ value: [...] }` 형태로 직렬화되어 히어로 초기화가 중단되던 문제를 수정
- 2026-07-11: CSS 버튼 노드 배치를 중단하고 Region Map과 동일한 좌표계의 `nodeStateCanvas`/`hitMapCanvas` 기반 판정 구조로 전환
- 2026-07-11: Region Map 원본 이미지(1536x1024)와 화면 박스 비율이 달라질 때 노드 상태 canvas와 숨은 hitmap이 어긋나던 문제를 수정한다. 이미지가 실제로 표시되는 영역과 두 canvas의 위치/크기를 동기화한 뒤 클릭 좌표를 변환한다.
- 2026-07-11: 잠김 노드는 큰 별도 버튼 그래픽처럼 덮지 않고, 맵의 원형 패드 위에 얇은 상태 링만 표시한다. 사용자는 노드 패드를 클릭해 상세 패널에서 locked/bronze/silver/gold 상태와 플레이 횟수를 확인한다.
- 2026-07-11: 사용자 표시 이미지를 기준으로 Social Isles의 실제 노드를 33개로 확정했다. 33개 좌표만 `user-marked-v3-social-isles`로 배치하고, 초과 9개 게임은 잘못된 위치에 표시되지 않도록 `unplaced` 상태로 보존한다.
- 2026-07-11: Social Isles의 클릭 반경은 배경 패드 크기와 동일하게 제한한다. 중앙 광장, 다리, 수풀 등 파란색으로 표시되지 않은 영역은 클릭해도 게임 상세가 열리지 않아야 한다.
- 2026-07-11: 사용자 표시 이미지를 기준으로 Mystery District의 실제 노드를 26개로 확정했다. 26개 좌표만 `user-marked-v1-mystery-district`로 배치하고, 초과 1개 게임은 `unplaced` 상태로 보존한다.
- 2026-07-11: 맵 노드 수가 게임 수보다 많을 때도 노드를 제거하지 않는다. 빈 노드는 `nodeId`를 가지며 `gameId: null`, `data: "none"`으로 저장하고, 클릭 시 상세 패널에 `NONE`을 표시한다.
- 2026-07-11: 사용자 표시 이미지를 기준으로 Strategy Plains 30개, Engine Highlands 32개, Route & Territory Coast 28개, Wagering Port 20개 노드를 확정했다. 각 지역은 `user-marked-v1-*` 좌표와 지역별 클릭 반경을 사용한다.
- 2026-07-11: 여섯 지역의 실제 노드 169개에 게임 157개를 중복 없이 배치한다. 게임 노드 157개와 `data: "none"` 빈 노드 12개의 합이 169개인지 검증하며, 모든 `placementStatus`는 `placed`여야 한다.
- 2026-07-11: 전체 검수 결과 게임 카탈로그 157개와 게임 연결 노드 157개가 정확히 일치하며 중복, 누락, 미등록 게임은 0개다. 빈 노드는 12개, 전체 노드는 169개이고 모든 노드가 고유 좌표·고유 `nodeId`·비겹침 클릭 영역을 가진다.
- 2026-07-11: Hub Map과 Region Map은 화면을 꽉 채우기 위해 자르는 `cover` 방식이 아니라, 원본 비율을 유지하며 전체 이미지가 보이는 `contain` 방식으로 표시한다. 넓은 화면에서는 좌우 여백이 생길 수 있지만 맵 가장자리와 노드 좌표가 잘리지 않는 것을 우선한다.
