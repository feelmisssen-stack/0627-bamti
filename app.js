/*
 * 보안 안내:
 * 1. 프론트엔드에 API 키를 넣으면 개발자 도구에서 노출될 수 있다.
 * 2. Gemini API 호출은 Vercel Serverless Function(/api/gemini-counseling)에서 처리한다.
 * 3. .env 파일은 GitHub에 올리지 않는다.
 * 4. Vercel 배포 시 Project Settings > Environment Variables에 GEMINI_API_KEY를 등록해야 한다.
 * 5. Gemini로 전송하는 데이터는 이름, 학번, 사진 경로를 제외한 최소 정보로 제한한다.
 */

const USERS = [
  { id: "admin", password: "2026", role: "admin", name: "관리자" },
  { id: "10101", password: "1234", role: "student", studentId: "10101" },
  { id: "10102", password: "1234", role: "student", studentId: "10102" },
  { id: "10103", password: "1234", role: "student", studentId: "10103" },
];

const STUDENTS = [
  {
    id: "10101",
    name: "김코딩",
    photo: "assets/10101_김코딩.jpg",
    grades: {
      "정보 수행평가": "A",
      "웹앱 프로젝트": "92점",
      "디지털 윤리 퀴즈": "88점",
      "수업 참여도": "상",
    },
    traits: [
      "문제 해결 과정을 차분히 설명합니다.",
      "새 도구를 시도할 때 기록을 꼼꼼히 남깁니다.",
      "제출 전 확인 습관을 더 연습하면 좋습니다.",
    ],
    teacherMemo: "프론트엔드 구조 이해가 빠르며, 팀원 질문에 답하는 태도가 좋습니다.",
  },
  {
    id: "10102",
    name: "박개발",
    photo: "assets/10102_박개발.jpg",
    grades: {
      "정보 수행평가": "B+",
      "웹앱 프로젝트": "86점",
      "디지털 윤리 퀴즈": "91점",
      "수업 참여도": "중상",
    },
    traits: [
      "협업 중 역할 분담을 잘 지킵니다.",
      "UI 수정 아이디어를 자주 제안합니다.",
      "프로젝트 범위를 작게 나누는 연습이 필요합니다.",
    ],
    teacherMemo: "기능 구현 의욕이 높고, 오류가 날 때 원인을 함께 추적하려는 태도가 좋습니다.",
  },
  {
    id: "10103",
    name: "이교사",
    photo: "assets/10103_이교사.jpg",
    grades: {
      "정보 수행평가": "A-",
      "웹앱 프로젝트": "89점",
      "디지털 윤리 퀴즈": "95점",
      "수업 참여도": "상",
    },
    traits: [
      "학습 내용을 자기 언어로 정리합니다.",
      "개선할 지점을 발견하면 근거를 함께 제시합니다.",
      "코드 주석을 더 구체적으로 쓰면 좋습니다.",
    ],
    teacherMemo: "질문의 초점이 좋고, 개선 방향을 토의하는 데 적극적입니다.",
  },
];

const STUDENT_ALIASES = ["학생 A", "학생 B", "학생 C"];
const COUNSELING_PLACEHOLDER =
  "수업 참여는 좋은데 평가 결과가 낮습니다. 어떻게 상담하면 좋을까요?\n" +
  "과제 제출이 자주 늦습니다. 혼내기보다는 원인을 파악하고 싶은데 어떻게 접근하면 좋을까요?\n" +
  "친구들과 협업할 때 소극적인 편입니다. 어떤 질문으로 대화를 시작하면 좋을까요?";

const loginForm = document.querySelector("#loginForm");
const userIdInput = document.querySelector("#userId");
const passwordInput = document.querySelector("#password");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");
const loginView = document.querySelector("#loginView");
const studentView = document.querySelector("#studentView");
const adminView = document.querySelector("#adminView");

let currentUser = null;
let selectedCounselingStudentId = null;

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const id = userIdInput.value.trim();
  const password = passwordInput.value;
  const user = USERS.find((item) => item.id === id && item.password === password);

  if (!user) {
    loginMessage.textContent = "아이디 또는 비밀번호가 올바르지 않습니다.";
    passwordInput.value = "";
    passwordInput.focus();
    return;
  }

  currentUser = user;
  loginMessage.textContent = "";
  loginForm.reset();

  if (user.role === "admin") {
    renderAdminDashboard();
  } else {
    const student = STUDENTS.find((item) => item.id === user.studentId);
    renderStudentPage(student);
  }
});

logoutButton.addEventListener("click", () => {
  currentUser = null;
  showOnly(loginView);
  logoutButton.classList.add("hidden");
  userIdInput.focus();
});

function showOnly(targetView) {
  [loginView, studentView, adminView].forEach((view) => view.classList.add("hidden"));
  targetView.classList.remove("hidden");
}

function renderStudentPage(student) {
  if (!student) {
    loginMessage.textContent = "학생 정보를 찾을 수 없습니다.";
    showOnly(loginView);
    return;
  }

  studentView.innerHTML = `
    <div class="view-header">
      <div class="view-title">
        <p class="eyebrow">Student</p>
        <h2>${student.name} 학생 페이지</h2>
        <p>로그인한 학생의 학습 현황을 확인합니다.</p>
      </div>
    </div>

    <div class="student-layout">
      <article class="student-profile">
        <img class="student-photo" src="${student.photo}" alt="${student.name} 학생 사진" />
        <div class="profile-body">
          <h3>${student.name}</h3>
          <p class="student-number">학번 ${student.id}</p>
          <div class="tag-row" aria-label="학습 키워드">
            <span class="tag">정보</span>
            <span class="tag">프로젝트</span>
          </div>
        </div>
      </article>

      <div class="content-stack">
        ${renderGrades(student.grades, false, `gradesTitle-${student.id}`)}
        ${renderTraits(student)}
      </div>
    </div>
  `;

  showOnly(studentView);
  logoutButton.classList.remove("hidden");
}

function renderAdminDashboard() {
  selectedCounselingStudentId = null;

  adminView.innerHTML = `
    <div class="view-header">
      <div class="view-title">
        <p class="eyebrow">Admin</p>
        <h2>관리자 대시보드</h2>
        <p>학생 3명의 학습 현황을 한 화면에서 비교합니다.</p>
      </div>
    </div>

    <section class="admin-grid" aria-label="전체 학생 정보">
      ${STUDENTS.map(renderStudentCard).join("")}
    </section>

    ${renderCounselingPanel()}
  `;

  updateCounselingPreview();
  showOnly(adminView);
  logoutButton.classList.remove("hidden");
}

function renderCounselingPanel() {
  return `
    <section class="counseling-panel" id="counselingPanel" aria-labelledby="counselingPanelTitle">
      <div class="section-title">
        <h3 id="counselingPanelTitle">AI 학생 상담 전략 도우미</h3>
      </div>

      <div id="counselingSelectedStudent">
        <p class="counseling-empty">학생 카드의 "상담 전략 요청" 버튼을 눌러 학생을 선택하세요.</p>
      </div>

      <div class="counseling-field">
        <label for="teacherConcern">교사 고민</label>
        <textarea
          id="teacherConcern"
          placeholder="${COUNSELING_PLACEHOLDER}"
        ></textarea>
      </div>

      <div class="counseling-preview">
        <h4>전송 데이터 미리보기</h4>
        <pre id="counselingPreview">학생을 선택하면 Gemini에 전송될 JSON 데이터가 표시됩니다.</pre>
      </div>

      <div class="counseling-actions">
        <button id="counselingSubmit" class="primary-button" type="button">AI 상담 전략 받기</button>
      </div>

      <p id="counselingLoading" class="counseling-loading hidden" aria-live="polite">
        AI가 상담 전략을 생성하는 중입니다.
      </p>
      <p id="counselingError" class="form-message" role="alert" aria-live="polite"></p>
      <div id="counselingResult" class="counseling-result hidden" aria-live="polite"></div>

      <p class="counseling-disclaimer">
        AI 상담 전략은 참고용입니다. 최종 판단과 실제 상담은 교사가 학생의 상황을 종합적으로 고려하여 진행해야 합니다.
      </p>
    </section>
  `;
}

function getStudentAlias(studentId) {
  const index = STUDENTS.findIndex((item) => item.id === studentId);
  return index >= 0 ? STUDENT_ALIASES[index] : "학생";
}

function buildGradeSummary(grades) {
  return Object.entries(grades)
    .map(([label, value]) => `${label} ${value}`)
    .join(", ");
}

function buildLearningTraits(student) {
  return student.traits.join(" ");
}

function buildCounselingPayload(studentId, teacherConcern) {
  const student = STUDENTS.find((item) => item.id === studentId);
  if (!student) {
    return null;
  }

  return {
    studentAlias: getStudentAlias(student.id),
    gradeSummary: buildGradeSummary(student.grades),
    learningTraits: buildLearningTraits(student),
    teacherConcern: teacherConcern.trim(),
  };
}

function renderCounselingPreview(payload) {
  if (!payload) {
    return "학생을 선택하면 Gemini에 전송될 JSON 데이터가 표시됩니다.";
  }

  return JSON.stringify(payload, null, 2);
}

function renderSelectedStudentInfo(student) {
  const alias = getStudentAlias(student.id);

  return `
    <div class="counseling-selected">
      <div class="counseling-selected-grid">
        <div class="counseling-selected-block">
          <h4>화면 표시 정보</h4>
          <p>${student.name} · 학번 ${student.id}</p>
        </div>
        <div class="counseling-selected-block">
          <h4>Gemini 전송용 익명화 정보</h4>
          <p>${alias}</p>
        </div>
      </div>
    </div>
  `;
}

function updateCounselingPreview() {
  const preview = document.querySelector("#counselingPreview");
  const concernInput = document.querySelector("#teacherConcern");
  if (!preview || !concernInput) {
    return;
  }

  const payload = selectedCounselingStudentId
    ? buildCounselingPayload(selectedCounselingStudentId, concernInput.value)
    : null;

  preview.textContent = renderCounselingPreview(payload);
}

function selectCounselingStudent(studentId) {
  const student = STUDENTS.find((item) => item.id === studentId);
  if (!student) {
    return;
  }

  selectedCounselingStudentId = studentId;

  document.querySelectorAll(".student-card").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.studentId === studentId);
  });

  const selectedArea = document.querySelector("#counselingSelectedStudent");
  if (selectedArea) {
    selectedArea.innerHTML = renderSelectedStudentInfo(student);
  }

  document.querySelector("#counselingError").textContent = "";
  document.querySelector("#counselingResult").classList.add("hidden");
  document.querySelector("#counselingResult").textContent = "";
  updateCounselingPreview();

  document.querySelector("#counselingPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function requestCounselingStrategy() {
  const errorEl = document.querySelector("#counselingError");
  const loadingEl = document.querySelector("#counselingLoading");
  const resultEl = document.querySelector("#counselingResult");
  const concernInput = document.querySelector("#teacherConcern");
  const submitButton = document.querySelector("#counselingSubmit");

  errorEl.textContent = "";
  resultEl.classList.add("hidden");
  resultEl.textContent = "";

  if (!selectedCounselingStudentId) {
    errorEl.textContent = "먼저 학생 카드에서 상담 전략 요청을 선택해주세요.";
    return;
  }

  const teacherConcern = concernInput.value.trim();
  if (!teacherConcern) {
    errorEl.textContent = "상담 고민을 먼저 입력해주세요.";
    concernInput.focus();
    return;
  }

  const payload = buildCounselingPayload(selectedCounselingStudentId, teacherConcern);
  updateCounselingPreview();

  loadingEl.classList.remove("hidden");
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/gemini-counseling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "request failed");
    }

    resultEl.textContent = data.result;
    resultEl.classList.remove("hidden");
  } catch (error) {
    errorEl.textContent =
      "AI 상담 전략을 불러오지 못했습니다. API 키 또는 Vercel 환경 변수를 확인해주세요.";
  } finally {
    loadingEl.classList.add("hidden");
    submitButton.disabled = false;
  }
}

function bindAdminCounselingEvents() {
  adminView.addEventListener("click", (event) => {
    const selectButton = event.target.closest(".counseling-select-btn");
    if (selectButton) {
      selectCounselingStudent(selectButton.dataset.studentId);
      return;
    }

    if (event.target.closest("#counselingSubmit")) {
      requestCounselingStrategy();
    }
  });

  adminView.addEventListener("input", (event) => {
    if (event.target.id === "teacherConcern") {
      updateCounselingPreview();
    }
  });
}

function renderStudentCard(student) {
  return `
    <article class="student-card" data-student-id="${student.id}">
      <img class="student-photo" src="${student.photo}" alt="${student.name} 학생 사진" />
      <div class="student-card-body">
        <h3>${student.name}</h3>
        <p class="student-number">학번 ${student.id}</p>
        ${renderGrades(student.grades, true, `gradesTitle-${student.id}`)}
        ${renderTraits(student)}
        <button
          class="ghost-button counseling-select-btn"
          type="button"
          data-student-id="${student.id}"
        >
          상담 전략 요청
        </button>
      </div>
    </article>
  `;
}

function renderGrades(grades, compact = false, headingId = "gradesTitle") {
  const rows = Object.entries(grades)
    .map(([label, value]) => `<tr><th scope="row">${label}</th><td>${value}</td></tr>`)
    .join("");

  return `
    <section aria-labelledby="${headingId}">
      <div class="section-title">
        <h3 id="${headingId}">성적 정보</h3>
      </div>
      <table class="grade-table ${compact ? "compact-table" : ""}">
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function renderTraits(student) {
  return `
    <section aria-labelledby="traitsTitle-${student.id}">
      <div class="section-title">
        <h3 id="traitsTitle-${student.id}">학습 특성 및 교사 메모</h3>
      </div>
      <ul class="memo-list">
        ${student.traits.map((trait) => `<li>${trait}</li>`).join("")}
        <li>${student.teacherMemo}</li>
      </ul>
    </section>
  `;
}

showOnly(loginView);
bindAdminCounselingEvents();
