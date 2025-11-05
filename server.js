import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 환경변수 (Render에서 설정)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 예시 API: 모든 사용자 조회
app.get("/api/users", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 예시 API: 사용자 추가
app.post("/api/users", async (req, res) => {
  const { name, email } = req.body;
  const { data, error } = await supabase.from("users").insert([{ name, email }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/heart_beat", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/api/heart_beat_ai", async (req, res) => {
  try {
    // 최근 심박 데이터 10개 조회
    const { data, error } = await supabase
      .from("heart_beat")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    // 단순 평균 BPM 계산 (AI 분석 자리에 해당)
    const avgBpm =
      data.length > 0
        ? data.reduce((sum, row) => sum + row.bpm, 0) / data.length
        : 0;

    res.json({
      success: true,
      avg_bpm: avgBpm,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
