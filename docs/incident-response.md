# 로컬 장애 대응 설치와 운영

소스·검사·runbook은 `scripts/incident-response/`에서 버전 관리한다.
GitHub Availability는 30분마다 가용성을 확인하고, 로컬 Node 점검기는 매시 12·42분에 이슈와 진행 상태를 확인한다.
정상·CI 대기·배포 대기에는 모델을 호출하지 않는다.
진행 중인 장애 또는 이미 시작한 대응의 준비된 후속 단계만 ChatGPT 구독으로 `gpt-6.1-sol / High`를 호출한다.
각 호출은 기존 `bendd` 프로젝트의 독립된 새 세션이다. 최대 세 실행이 같은 이슈·PR·격리 worktree를 통해 이어지며 원래 설정 대화와 이전 세션의 이력은 가져오지 않는다.

## 저장소와 운영 데이터

| 저장소에 포함                         | 로컬에만 보관                                     |
| ------------------------------------- | ------------------------------------------------- |
| 제어 소스와 단위·전송·설치 검사       | 실제 `config.json`과 장비 경로·앱 프로젝트 ID     |
| 설정 템플릿, 설치기와 plist 생성 코드 | `state/`, `results/`, incident `worktrees/`       |
| runbook, 포스트모템 형식, CI 검사     | 준비한 버전, 활성 버전 선택, 설치·복구 기록       |
| 서비스 인증을 사용하는 코드           | 각 서비스의 기존 로그인; 복사하거나 출력하지 않음 |

기본 운영 위치는 `~/.codex/automations/bendd-incident-response-support`다.
다른 위치는 모든 관리 명령에 `--directory /절대/경로`로 지정한다.
운영 위치는 Git 저장소 밖이어야 한다. 런타임은 Node 내장 모듈만 사용하며 추가 서비스·API 키·크레딧 구매가 필요하지 않다.
Mac이 잠들거나 꺼져 있으면 로컬 대응은 지연된다. GitHub 감시는 계속된다.

```text
bendd-incident-response-support/
├── current -> releases/<검토한 커밋>
├── releases/<커밋>/scripts/
│   ├── check-availability.mjs
│   └── incident-response/
│       ├── 제어 소스, README.md, POSTMORTEM.md
│       ├── config.json, launch-agent.plist
│       └── manifest.json
├── config.json
├── installation.json, activation.json
├── legacy-backup/
├── state/
├── results/
└── worktrees/
```

가용성 검사 소스는 기존 `scripts/check-availability.mjs`를 공유한다.
설치기는 명시한 커밋의 Git blob을 추출하므로 미커밋 수정이나 다음 PR은 실행 버전에 섞이지 않는다.
매 점검에서 스냅샷과 실제 설정의 SHA-256을 확인한다. 변경되면 모델 실행을 중단한다.
장애 대응 세션은 제어 코드를 수정하지 않는다. 변경은 별도 유지보수 PR로 처리한다.

## 준비와 활성화

필수 환경은 macOS, Node 24, 저장소가 지정한 pnpm, GitHub CLI, Codex CLI **0.154.0**, Vercel CLI 로그인이다.
Codex CLI는 ChatGPT 구독으로 로그인하고 앱에 원본 저장소 경로를 `bendd` 프로젝트로 등록한다.
CLI 버전이 달라지면 공개 schema와 새 프로젝트 세션·High 설정을 검증한 뒤 버전 제한을 변경한다.
설치기는 도구를 설치하거나 자동 업그레이드하지 않는다.

```bash
pnpm install --frozen-lockfile
pnpm test:incident
BENDD_RESPONSE_COMMIT='검토한 40자리 커밋 SHA로 교체'
pnpm incident:manage prepare --ref "$BENDD_RESPONSE_COMMIT" --project /절대/경로/bendd
pnpm incident:manage activate --version "$BENDD_RESPONSE_COMMIT"
pnpm incident:manage status
```

`prepare`는 브랜치 이름을 받지 않는다. 지정한 커밋을 private 스냅샷으로 준비하며 실행 중인 설정·상태·스케줄러는 바꾸지 않는다.
실행 파일 경로를 확인하고 앱의 `project/list`에서 이름과 원본 경로가 맞는 한 프로젝트를 찾는다.
계정·프로젝트·독립된 임시 세션·모델·High를 검증하지만 `turn/start`를 호출하지 않으므로 모델 사용량은 발생하지 않는다.
GitHub 저장소·활성 Availability와 Vercel의 정확한 Production 식별도 읽기만 한다.
API 인증, 중복 프로젝트, schema 차이, 401/403이면 중단하며 다른 인증이나 프로젝트로 우회하지 않는다.
새 Mac의 프로젝트 ID는 이 검사에서 다시 확인한다.
Git 원격은 정확한 GitHub 저장소로 제한한다. 현재 사용하는 계정별 SSH 별칭은
유효 hostname이 `github.com`, user가 `git`인지 확인한 경우에만 허용한다.

기존 로컬 설정의 `enabled_at`과 제외할 세션 ID를 유지한다.
다른 설정 파일을 참고하려면 `prepare --config /private/config.json --project /새/경로/bendd`를 사용한다.
실제 설정을 PR에 올리지 않는다. 새 설치는 준비 시각 이후 생성된 장애부터 대상으로 삼는다.
같은 커밋은 동일 설정으로 다시 준비할 수 있다. 준비 후 설정이 달라지면 스냅샷을 덮어쓰지 않고 중단한다.

`activate`는 명시적으로 스케줄러를 변경한다.
watcher와 같은 배타적 잠금을 잡고 기존 job을 정지한 뒤 활성 버전과 설정을 선택하고 LaunchAgent를 등록한다.
진행 중이거나 중단된 watcher 잠금이 있으면 삭제하지 않고 중단한다.
등록 시 첫 실행이 설치 잠금 때문에 `busy`로 끝날 수 있으며, 다음 예정 점검부터 선택한 버전을 사용한다.
기존 Codex 앱 heartbeat `bendd`는 PAUSED로 유지한다.
PR 병합은 로컬 실행 버전을 자동 변경하지 않는다.

최초 편입 시 기존 v1 manifest를 검증하고 제어 파일·설정·plist만 `legacy-backup/`에 보관한다.
기존 루트의 제어 파일과 장애 기록은 유지한다. 로그인 파일·state·results·worktrees는 이 백업에 포함하지 않는다.
알 수 없거나 수정된 기존 설치는 덮어쓰지 않는다.

## 점검과 롤백

모델 없는 점검은 GitHub와 운영 응답을 읽고 로컬 점검 상태를 기록한다.

```bash
BENDD_RESPONSE_HOME="$HOME/.codex/automations/bendd-incident-response-support"
BENDD_INCIDENT_HOME="$BENDD_RESPONSE_HOME" node "$BENDD_RESPONSE_HOME/current/scripts/incident-response/watch.mjs" --check
pnpm incident:manage status
pnpm incident:manage rollback
```

`rollback`은 이전에 설치한 검증된 버전으로 되돌린다. `rollback --version <준비된-SHA>`로 버전을 지정할 수 있다.
최초 편입의 이전 버전은 `legacy`이며 기존 루트의 제어 파일과 plist를 다시 사용한다.
운영 데이터는 되돌리지 않으므로 이미 대응한 이슈를 새 장애로 재실행하지 않는다.

스케줄러 변경 실패는 `activation.json`에 `needs_action`과 이전/시도한 버전을 남긴다.
재등록을 반복하지 않고 기록을 확인한 뒤 명시적으로 rollback한다.
파일 변경 도중 실패·프로세스 종료·손상된 metadata·잠금이 남은 경우 자동 복구를 주장하지 않는다.
실제 프로세스와 파일을 조사하고 사용자 조치를 요청한다. state와 dispatch 기록을 삭제하거나 정상 상태로 초기화하지 않는다.

구독 한도·접근 거부·승인 검토 거부·실패한 수정은 같은 단계에서 자동 재시도하지 않는다.
접근 복구 뒤 사용자 재확인 승인이 있는 경우에만 활성 버전의 `watch.mjs unblock`을 사용한다.
자동 코드 PR 병합은 runbook의 앱 경로·정확한 SHA·필수 CI/CodeQL/Preview gate에 한정된다.
이 유지보수 PR이나 제어 코드·CI·인증·개인정보 변경은 자동 병합 범위에 포함되지 않는다.

## Mac 교체

1. 이전 Mac의 job을 정지하고 진행 중인 장애와 watcher 프로세스를 확인한다. 양쪽에서 동시에 대응하지 않는다.
2. 새 Mac에 저장소와 선언된 도구를 준비하고 서비스에 다시 로그인한다. 인증 파일은 복사하지 않는다.
3. 앱에 원본 경로를 `bendd` 프로젝트로 등록한다.
4. 이전 `state/`, `results/`와 설정을 안전하게 옮긴다. 이전 release·current·plist·실행 파일 경로를 그대로 재사용하지 않는다.
5. 검토한 커밋을 새 원본 경로로 prepare한다. 실행 파일과 앱 프로젝트 ID는 새 장비에서 확인한다.
6. 활성화 후 모델 없는 점검과 정상 스케줄 종료를 확인한다.

진행 중인 incident worktree의 Git 연결과 절대 경로는 별도 검증이 필요하다.
검증되지 않은 작업트리를 자동 재생성하거나 같은 조사·PR을 다시 시작하지 않는다.
완료된 대응 기록을 옮기는 경우에도 기존 claim/dispatch를 보존해 중복 대응을 막는다.

## 검증

`pnpm test:incident`는 실제 공개 이슈·수정 PR·병합·모델 호출을 만들지 않는다.
가짜 GitHub/Vercel adapter, 임시 Git 저장소와 scheduler, fake stdio 프로세스로 다음을 검사한다.

- 정상·자연 복구·CI/배포 대기의 모델 호출 0회, 중복과 손상된 상태 보존.
- ChatGPT 인증, 새 Bendd 프로젝트 세션, High, 이전 대화 이력 거부.
- 정확한 SHA/필수 gate/앱 경로를 만족한 PR만 병합.
- 고정 커밋 추출, 설정 템플릿, snapshot 무결성, 설치·롤백의 운영 기록 보존.
- API 인증·중복 프로젝트·접근 거부와 설치 잠금·등록 실패 시 중단.

CI Verify에 이 검사와 전용 lint·format을 추가했다. CI에는 서비스 로그인이나 새 비밀 값이 필요하지 않다.
실제 장애의 무인 수정·병합·복구 보고 전체 흐름은 첫 적합한 실제 장애에서 별도로 확인한다.
