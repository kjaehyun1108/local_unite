import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

// [ 🚀 1. 신규 라이브러리 임포트 ]
import multer from "multer"; // 파일 업로드 처리
import { ImageAnnotatorClient } from "@google-cloud/vision"; // Google Vision AI

// [ 🚀 2. ESM에서 __dirname, __filename 설정 ]
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// [ 🚀 3. 파일 업로드(multer) 및 Vision AI 클라이언트 설정 ]
const upload = multer({ storage: multer.memoryStorage() }); // 파일을 서버 메모리에 임시 저장

// Google Cloud 인증 정보 (Render 환경 변수에서 읽어옴)
let visionClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        visionClient = new ImageAnnotatorClient({ credentials });
        console.log("Google Vision AI 클라이언트 (JSON) 초기화 성공.");
    } catch (e) {
        console.error("Google Cloud JSON 인증 파싱 실패:", e.message);
    }
} else {
    console.warn("GOOGLE_APPLICATION_CREDENTIALS_JSON 환경 변수가 없습니다. (로컬 테스트 시에는 별도 설정 필요)");
    // 로컬 개발 시: GOOGLE_APPLICATION_CREDENTIALS 파일 경로로 자동 인증 시도
    visionClient = new ImageAnnotatorClient();
}

// [ 🚀 4. Supabase 및 Express 설정 (기존과 동일) ]
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- (기존 API: heart_beat_ai, diabetes_logs 등은 수정 없이 그대로 둠) ---
// ... (app.post("/api/heart_beat_ai", ...))
// ... (app.post("/api/diabetes_logs", ...))
// ... (app.get("/api/diabetes_logs", ...))

// --- [ 🚀 5. (핵심) AI 식단 분석 API 엔드포인트 ] ---
app.post("/api/analyze-meal", upload.single('mealImage'), async (req, res) => {
    
    // 1. 프론트엔드에서 보낸 파일과 현재 혈당 받기
    if (!req.file) {
        return res.status(400).json({ error: "이미지 파일이 필요합니다." });
    }
    const imageBuffer = req.file.buffer;
    const currentGlucose = parseInt(req.body.currentGlucose) || 100;

    try {
        // 2. Google Vision AI에 이미지 전송 (Label Detection)
        const [result] = await visionClient.labelDetection(imageBuffer);
        const labels = result.labelAnnotations.map(label => label.description.toLowerCase());
        
        // (디버깅) Vision AI가 인식한 라벨
        console.log("Vision AI Labels:", labels);
        const recognizedFood = labels.slice(0, 5).join(', '); // 상위 5개 라벨

        // 3. [시뮬레이션] 영양 정보 API (탄수화물 계산)
        // (실제 구현: labels를 영양 API(Edamam 등)에 보내 g을 받아와야 함)
        let totalCarbs = 0;
        if (labels.some(l => l.includes('rice'))) totalCarbs += 45;
        if (labels.some(l => l.includes('bread'))) totalCarbs += 30;
        if (labels.some(l => l.includes('kimchi'))) totalCarbs += 5;
        if (labels.some(l => l.includes('egg'))) totalCarbs += 1;
        if (labels.some(l => l.includes('stew') || l.includes('soup'))) totalCarbs += 10;
        if (totalCarbs === 0 && labels.length > 0) totalCarbs = 20; // 기타 음식

        // 4. [시뮬레이션] 체크리스트 기반 보정
        // (실제 구현: DB에서 유저의 BMI, 운동량 등 조회)
        const correctionFactor = 1.2; // (예: BMI가 높고 운동량이 적으면 1.5)

        // 5. 혈당 증가량 계산 (가짜 공식)
        const predictedIncrease = Math.round((totalCarbs * 0.5) * correctionFactor);
        const predictedGlucose = currentGlucose + predictedIncrease;

        let status = 'warning';
        let icon = 'fa-exclamation-circle';
        let title = '혈당 스파이크 주의';
        if (predictedIncrease > 60) { status = 'danger'; icon = 'fa-exclamation-triangle'; title = '고혈당 스파이크 위험'; }
        else if (predictedIncrease < 30) { status = 'normal'; icon = 'fa-check-circle'; title = '안전한 식단'; }

        // 6. 프론트엔드로 최종 결과 전송
        res.status(200).json({
            // (결과창 표시에 필요한 모든 데이터를 보냄)
            recognizedFood: recognizedFood,
            totalCarbs: totalCarbs,
            predictedIncrease: predictedIncrease,
            predictedGlucose: predictedGlucose,
            currentGlucose: currentGlucose,
            status: status,
            icon: icon,
            title: title,
            recommendation: "AI 제안: 탄수화물 비중이 높습니다. 쌀밥의 양을 반으로 줄이고 채소 반찬을 추가하세요."
        });

    } catch (error) {
        console.error("AI 식단 분석 오류:", error);
        res.status(500).json({ error: error.message });
    }
});


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
