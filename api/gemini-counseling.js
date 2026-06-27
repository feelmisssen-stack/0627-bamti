/*
 * 보안 안내:
 * 1. 프론트엔드에 API 키를 넣으면 개발자 도구에서 노출될 수 있다.
 * 2. Gemini API 호출은 Vercel Serverless Function에서 처리한다.
 * 3. .env 파일은 GitHub에 올리지 않는다.
 * 4. Vercel 배포 시 Project Settings > Environment Variables에 GEMINI_API_KEY를 등록해야 한다.
 * 5. Gemini로 전송하는 데이터는 이름, 학번, 사진 경로를 제외한 최소 정보로 제한한다.
 */

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "POST 요청만 허용됩니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.",
    });
  }

  const { studentAlias, gradeSummary, learningTraits, teacherConcern } = req.body || {};

  if (!studentAlias || !gradeSummary || !learningTraits || !teacherConcern) {
    return res.status(400).json({
      success: false,
      error: "studentAlias, gradeSummary, learningTraits, teacherConcern은 필수입니다.",
    });
  }

  const prompt = [
    "당신은 초·중등 교사를 돕는 학생 상담 전략 조언 도우미입니다.",
    "아래 익명화된 학생 정보와 교사의 상담 고민을 바탕으로 상담 전략을 제안해 주세요.",
    "",
    `[학생 별칭] ${studentAlias}`,
    `[성적 요약] ${gradeSummary}`,
    `[학습 특성 요약] ${learningTraits}`,
    `[교사 상담 고민] ${teacherConcern}`,
    "",
    "반드시 아래 6개 항목 제목을 그대로 사용하고, 각 항목마다 2~4문장으로 작성하세요.",
    "1. 현재 상황 요약",
    "2. 학생 데이터 기반 해석",
    "3. 상담 접근 전략",
    "4. 교사가 던질 수 있는 질문 3개",
    "5. 피해야 할 말 또는 주의점",
    "6. 다음 수업에서 해볼 수 있는 작은 지원",
    "",
    "원칙:",
    "- 학생을 단정적으로 판단하거나 진단하지 마세요.",
    "- '의지가 부족하다', '주의력 문제가 있다', '심리적 문제가 있다' 같은 단정 표현을 피하세요.",
    "- 교사가 학생을 이해하고 대화할 수 있도록 돕는 방향으로 작성하세요.",
    "- 마지막에 '이 상담 전략은 참고용이며, 최종 판단은 교사가 학생의 상황을 종합적으로 고려하여 진행해야 합니다.' 문장을 포함하세요.",
  ].join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({
        success: false,
        error: `Gemini API 호출에 실패했습니다. (${response.status}) ${errorText}`,
      });
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!result) {
      return res.status(500).json({
        success: false,
        error: "Gemini 응답을 처리할 수 없습니다.",
      });
    }

    return res.status(200).json({ success: true, result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "알 수 없는 서버 오류가 발생했습니다.",
    });
  }
};
