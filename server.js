import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 환경변수 (Render 등에서 설정)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- 기존 고혈압 API ---
app.post("/api/heart_beat_ai", async (req, res) => {
  const { bpm, systolic, diastolic } = req.body;
  try {
    const { data, error } = await supabase
      .from("heart_beat_ai")
      .insert([{ bpm, systolic, diastolic }]);
    if (error) throw error;
    res.status(200).json({ message: "Heart beat data inserted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- [신규] 당뇨병 API ---

// [신규] 1. 당뇨병 데이터 저장 (POST)
app.post("/api/diabetes_logs", async (req, res) => {
  const { glucose, check_time } = req.body;

  if (!glucose || !check_time) {
    return res.status(400).json({ error: "glucose and check_time are required." });
  }

  try {
    const { data, error } = await supabase
      .from("diabetes_logs") // 1단계에서 만든 Supabase 테이블
      .insert([{ glucose, check_time }]);
    
    if (error) throw error;
    res.status(201).json({ message: "Diabetes log inserted successfully", data: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// [신규] 2. 당뇨병 데이터 불러오기 (GET) - GV 차트용
app.get("/api/diabetes_logs", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("diabetes_logs")
      .select("*")
      .order("created_at", { ascending: true }); // 시간순 정렬

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// [참고] AI 식단 분석용 API (실제 구현 시)
// (이 부분은 Google Vision API 키와 복잡한 로직이 필요하여 비워둡니다)
// app.post("/api/analyze-meal", upload.single('mealImage'), async (req, res) => {
//   // 1. req.file (이미지)을 Google Vision API로 전송
//   // 2. Vision API 결과 (음식 라벨)를 받음
//   // 3. 음식 라벨을 영양정보 DB (예: CalorieMama)에 매칭하여 탄수화물 계산
//   // 4. req.body.userId (가상) 로 유저의 '체크리스트' 정보 (BMI, 운동량) 조회
//   // 5. 탄수화물 + 개인 보정치 = 최종 혈당 변화 예측
//   // 6. res.json({ predictedIncrease: 50, foodName: "..." })
// });


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
