# 주간 예배 PPT 생성

날짜 인자: $ARGUMENTS (예: 260412)

## 작업 흐름

### 1. txt 파일에서 곡 순서 파싱
- `static/txt/$ARGUMENTS.txt` 파일을 읽는다
- 번호가 붙은 곡 목록을 순서대로 추출한다 (예: "1. 사도신경송", "2. [율동] 가장 특별해" → "사도신경송", "가장특별해")

### 2. 기존 pptx를 base로 복사
- `/Users/wook/Desktop/church/ppt/` 에서 가장 최근 날짜의 pptx를 찾아 base로 사용한다
- base를 `/Users/wook/Desktop/church/ppt/$ARGUMENTS.pptx`로 복사한다

### 3. base pptx 구조 파악
- base pptx를 열어 슬라이드 내용을 분석한다
- 구조: [도입부(기도, 사도신경낭독, 찬양타이틀)] + [찬양 곡 슬라이드들] + [후반부(대표기도~축복송)]
- 찬양타이틀 슬라이드("찬 양" 텍스트 포함) 바로 다음부터, 대표기도 슬라이드("대표기도" 텍스트 포함) 바로 전까지가 곡 슬라이드 영역이다

### 4. 곡 pptx 찾기
- `/Users/wook/Desktop/church/ppt/list/` 에서 각 곡에 해당하는 pptx를 찾는다
- 파일명에 공백/띄어쓰기 차이가 있을 수 있으므로 유연하게 매칭한다
- `_1`, `_2` 같은 suffix가 붙은 파일은 변형 버전이므로, suffix 없는 원본을 우선 사용한다

### 5. 곡 슬라이드 교체 (ZIP 레벨 조작)
- python-pptx는 검증용으로만 사용한다 (반드시 venv로 설치)
- venv 경로: `/Users/wook/Desktop/church/ppt/.venv` (없으면 생성)
- **반드시 ZIP 레벨에서 직접 조작한다** (python-pptx의 `relate_to`/`deepcopy` 방식은 이미지 rId 매핑이 꼬여서 사용 금지)
- 전체 흐름:
  1. pptx를 ZIP으로 읽어 `dict[파일명] → bytes` 형태로 메모리에 로드한다 (`zipfile` 사용)
  2. `ppt/presentation.xml`의 `sldIdLst`와 `ppt/_rels/presentation.xml.rels`를 파싱하여 슬라이드 순서를 파악한다
  3. 찬양타이틀~대표기도 사이의 곡 슬라이드를 `sldIdLst`, `presentation.xml.rels`, 파일 dict에서 제거한다
  4. 각 곡 pptx도 ZIP으로 읽어 슬라이드를 삽입한다
- 슬라이드 삽입 방법 (곡 pptx의 각 슬라이드마다):
  1. 소스 slideN.xml과 slideN.xml.rels를 그대로 복사한다 (새 번호로 rename)
  2. .rels 파일 내 미디어 참조(`../media/...`)의 실제 파일을 새 이름으로 복사한다 (전역 카운터로 충돌 방지)
  3. .rels 파일 내 `slideLayout` 관계의 Target을 타겟 pptx의 기존 슬라이드 layout 경로로 교체한다
  4. .rels 파일의 미디어 경로를 새 이름으로 업데이트한다
  5. `presentation.xml.rels`에 새 슬라이드 Relationship을 추가한다
  6. `sldIdLst`에 새 sldId를 찬양타이틀 바로 뒤(이전 삽입 슬라이드 뒤)에 삽입한다
  7. `[Content_Types].xml`에 새 슬라이드의 Override를 추가한다
- **슬라이드 XML과 rId는 원본 그대로 유지**되므로 이미지 매핑 문제가 발생하지 않는다
- 최종적으로 모든 변경된 XML과 파일을 ZIP으로 다시 저장한다

### 6. 없는 곡 처리
- list 폴더에 해당 곡 pptx가 없으면, 기존 곡 슬라이드의 스타일(폰트, 크기, 색상, 배경)을 참고하여 새로 만든다
- 가사는 웹에서 검색하여 정확하게 작성한다
- 새로 만든 곡 pptx는 `/Users/wook/Desktop/church/ppt/list/`에도 저장하여 재사용할 수 있게 한다

### 7. 저장 및 검증
- `/Users/wook/Desktop/church/ppt/$ARGUMENTS.pptx`로 저장한다
- 최종 슬라이드 목록을 출력하여 사용자에게 확인받는다

## 주의사항
- python-pptx 설치 시 반드시 venv 사용 (시스템 Python에 직접 설치 금지)
- **python-pptx의 `add_slide` + `relate_to` + `deepcopy` 방식은 이미지 rId 매핑이 꼬이므로 절대 사용하지 않는다**
- 반드시 ZIP 레벨(`zipfile` + `lxml`)에서 슬라이드 파일과 미디어를 직접 복사한다
- 미디어 파일명은 전역 카운터로 고유하게 생성하여 충돌을 방지한다
- 삽입 완료 후 python-pptx로 열어서 각 슬라이드의 이미지 MD5 해시를 소스와 비교 검증한다
