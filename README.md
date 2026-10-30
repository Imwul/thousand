# Across a Thousand Dead Worlds

종이 캐릭터 시트와 함께 사용하는 Across a Thousand Dead Worlds 개인용 오라클·솔로 GM 작업대.

```sh
npm ci
npm run dev -- --port 5180
```

<http://127.0.0.1:5180/>에서 연다. Node 22 이상. 런타임 외부 API나 유료 생성 서비스가 필요하지 않다.

```sh
npm test
npm run audit:play
npm run build
```

기본 플레이용 표 265개(원문 범위가 중복된 감정 하위 표 1개는 직접 확인)와 상황별 굴림 31개를 제공한다. 결과는 한국어 요약 또는 원문 영문이며 출처 쪽수·원래 주사위·당시 맥락을 함께 저장한다. 수록 시나리오 두 편의 전용 표는 사용자 요청으로 제외했다.

캐릭터 시트 수치를 관리하지 않는다. 피해·Stress·시간·물품은 종이에 기록한다. 잠긴 문과 해킹은 플레이어 선택 뒤 후속 굴림을 새 기록으로 만든다. 원문 오기는 추정해서 고치지 않는다.

데이터는 IndexedDB `thousand-worlds-logbook`에 캠페인별로 저장된다. 새로고침 뒤 복원된다. JSON 백업과 검증 후 가져오기, Markdown 내보내기를 제공한다. 서버·계정 동기화는 없다. 다른 브라우저·프로필·호스트에서는 백업을 가져와야 한다.

PC, 3440px 울트라와이드, 모바일 레이아웃을 포함한다. 보고서 Hahmlet Variable, 영문 제목 Barlow Condensed Black, 조작부 SUIT Variable을 사용하며 OFL을 동봉했다.

원문 PDF와 추출 캐시는 앱 소스·배포물에 포함하지 않는다. 엄폐도와 Guardian 능력치의 원문 도해는 개인용 사이트의 빠른 참조에 사용한다. 원작 © Blackoath Entertainment. 비공식 개인용 팬 도구.

구조는 `src/data`(원문·표), `src/domain`(모델), `src/generators`(난수·조건부 절차), `src/storage`(검증·기록), `src/components`(화면)로 나눈다. 기존 MÖRK BORG Reference Desk의 책임 분리를 참고했으며 UI는 별도로 디자인했다.
