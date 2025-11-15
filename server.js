import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import path from "path"; // [ 🚀 1. 'path' 모듈 임포트 ]
import { fileURLToPath } from "url"; // [ 🚀 2. 'url' 모듈 임포트 ]

// [ 🚀 3. ESM에서 __dirname을 사용하기 위한 설정 ]
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// [ 🚀 4. 'public' 폴더의 절대 경로를 지정 ]
app.use(express.static(path.join(__dirname, "public")));

// 환경변수 (Render 등에서 설정)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- (이하 API 코드는 모두 동일) ---
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

app.post("/api/diabetes_logs", async (req, res) => {
  const { glucose, check_time } = req.body;
  if (!glucose || !check_time) {
    return res.status(400).json({ error: "glucose and check_time are required." });
  }
  try {
    const { data, error } = await supabase
      .from("diabetes_logs") 
      .insert([{ glucose, check_time }]);
    if (error) throw error;
    res.status(201).json({ message: "Diabetes log inserted successfully", data: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/diabetes_logs", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("diabetes_logs")
      .select("*")
      .order("created_at", { ascending: true }); 
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
