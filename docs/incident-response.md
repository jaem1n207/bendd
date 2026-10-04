# 로컬 장애 대응 설치와 운영

소스·검사·runbook은 `scripts/incident-response/`에서 버전 관리한다.
GitHub Availability는 30분마다 가용성을 확인하고, 로컬 Node 점검기는 매시 12·42분에 이슈와 진행 상태를 확인한다.
정상·CI 대기·배포 대기에는 모델을 호출하지 않는다.
앱 콘텐츠 오류 근거가 있는 장애 또는 이미 시작한 대응의 준비된 후속 단계만 ChatGPT 구독으로 `gpt-6.1-sol / High`를 호출한다.
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

필수 환경은 macOS, Node 24, 저장소가 지정한 pnpm, GitHub CLI, Codex CLI **0.160.0**, Vercel CLI 로그인이다.
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

## 호스팅 장애와 원인 불명 실패

실패를 관측하면 모델을 시작하기 전에 공식 Vercel 상태와 응답의 안전한 오류 코드·지역을 확인한다.
관련 호스팅 장애는 대기, 상태 확인 불가·플랫폼/AWS upstream 코드·일반 5xx·네트워크 실패는
조치 필요로 남긴다. 모두 해당 점검의 모델 호출은 0회다. 같은 이유의 GitHub 이슈 댓글은 중복하지 않는다.
공식 상태 정상 + HTTP 200 + 예상한 응답 유형 + 앱 콘텐츠 누락이 확인된 경우만 조사한다.
따라서 원인이 아직 확인되지 않은 앱 500도 자동 수정하지 않는 보수적 정책이다.
현재 직접 의존하는 AWS 서비스/지역 목록은 없으며 AWS 전체 상태를 확인했다고 주장하지 않는다.
구체적인 분류·출처·재확인 동작은 실행 [README](../scripts/incident-response/README.md)를 따른다.

## Preview 장애 대응 리허설

실제 구독 모델 1회와 GitHub 이슈·Draft PR·Preview 배포를 사용하는 명시적 리허설이다.
추가 API 키는 사용하지 않는다. 아래 명령은 사용자 승인 후에만 실행한다. 플래그 없이 실행하면 중단한다.

```bash
pnpm incident:drill --run-authorized
```

1. 정상 Production의 ID·SHA·네 경로를 기록하고 원격 main에서 `drill/availability-...`를 만든다.
2. 해당 브랜치에만 RSS XML 루트 오류를 넣고 정확한 커밋의 보호된 Preview를 기다린다.
3. 승인받은 임시 Protection Bypass 키를 발급해 정확한 Preview origin에만 메모리에서 전달한다.
   redirect를 따라가지 않으며 키를 모델·파일·Git·로그에 전달하지 않는다.
4. 기존 monitor 코어에서 두 번 실패를 확인하고 명시적인 리허설 이슈를 만든다.
   실제 운영 대응기에는 해당 이슈가 장애 이슈로 인정되지 않는다. 실패/복구 간격은 2초로 단축한다.
5. 별도 상태 저장소와 격리된 수정 worktree에서 실제 새 Bendd 세션을 만든다.
   ChatGPT 구독 `gpt-6.1-sol / High`로 회귀 RED → 최소 수정 → GREEN → PR을 수행한다.
6. CodeQL default setup의 기본 브랜치 조건 때문에 처음에는 main 대상 **Draft** PR로 검증한다.
   main에는 병합하지 않는다. 같은 SHA의 CI·CodeQL·Preview를 통과하면 base를 리허설 브랜치로
   바꾸고 그 변경을 확인한 뒤 ready로 전환한다. 정확한 SHA·파일 범위·필수 검사를 다시 확인하고
   해당 리허설 브랜치에만 병합한다. 필수 검사가 누락되면 우회하지 않는다.
7. 병합 커밋의 Preview에서 네 경로를 두 번 확인하고 완료 재점검의 모델 호출 0회도 확인한다.
   `finally`에서 이번 실행의 접근 키만 삭제하고 실제 삭제를 확인한다. 실패도 같은 정리를 수행한다.
8. Production ID·SHA가 전후 동일한지 확인하고 한국 시간·관측 지속 시간·수정/검사/세션 근거를
   GitHub 이슈에 보고한다. 성공한 리허설 브랜치와 깨끗한 worktree만 병합 관계를 확인해 정리한다.

자료는 `~/.codex/automations/bendd-incident-drills/availability-.../`에 보존한다.
중단된 실행은 자동 재실행하거나 새 디렉터리로 중복 모델을 호출하지 않는다. 기록과 실제 PR부터 확인한다.
모델/이슈/PR 생성 전에 새 키 전파 대기 누락으로 중단한 경우만 `--run-authorized DIRECTORY --resume-before-model`로
동일 Preview와 상태를 한 번 이어갈 수 있다. 첫 중단 기록을 보존하며 401/403·모델 실행·반복 재개는 거부한다.
프로세스를 강제 종료하면 메모리의 키를 회수하는 finally가 실행되지 않을 수 있다. 정상 종료까지 기다리고
중단 시 Vercel 설정의 실제 키 상태를 확인해 수동 회수한다. 기존 키를 삭제/재생성하지 않는다.

이 리허설은 실제 수정 모델·PR·검사·Preview 복구·보고를 확인한다. 운영 bot 이슈의 출처 검증,
Production alias 복구, 실제 지역 장애, 최대 3단계 모델 재개, 30분 예약 실행 자체의 성공을 증명하지 않는다.
이 항목은 회귀 검사 또는 별도의 운영 관측 근거와 구분한다. 제공 업체 장애/분류 불가의 모델 호출 0회는
주입된 상태/응답을 이용한 회귀 검사 근거이며 실제 제공 업체에 장애를 만들지 않는다.

## 모델 호환성 검증

2026-10-05 Preview 리허설에서 기존 CLI 0.154.0은 새 프로젝트/High 세션 생성을 허용했지만
모델 실행을 HTTP 400으로 거부했다. 해당 계정의 공식 모델 목록에는 gpt-6.1-sol이 없었다.
공식 CLI 0.160.0의 체크섬을 검증한 임시 실행 파일에서는 gpt-6.1-sol/High 목록과
독립 Bendd 프로젝트·High·자동 승인 검토의 ephemeral 세션 검증을 통과했다. 이 검증은 모델 turn을 시작하지 않는다.

현재 소스는 0.160.0을 고정하고 `model/list`의 실제 지원 정보를 세션 생성 전에 검증한다.
기존 로컬 실행 버전은 prepare/activate 전까지 바뀌지 않는다. 실패한 모델 실행은 자동 재시도하지 않으며,
동일 미완료 리허설의 새 세션 실행도 사용자의 명시적 재개 승인 후 수행한다. 실제 수정/PR/복구 성공은
완료된 리허설 보고서가 있기 전까지 주장하지 않는다.
