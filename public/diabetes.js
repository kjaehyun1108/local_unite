// --- [ 🚀 1. Supabase 클라이언트 설정 ] ---
// (본인의 URL과 Anon Key로 수정하세요)
const SUPABASE_URL = 'https://ttselmicsanmajuxeajq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0c2VsbWljc2FubWFqdXhlYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTUyNDIsImV4cCI6MjA3Nzg3MTI0Mn0.-5djDYUwPCOmAi50sgyCrH65uBsnQoMLGUdJYxRjt5s';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// --- (이하 기존 코드) ---
let gvChart = null; 
let modal = null; 
let modalContent = null; 

document.addEventListener('DOMContentLoaded', function() {
    setupModal();
    initializeGVChart();
    loadAndDrawGVChart(); // 페이지 로드 시 Supabase에서 데이터 불러와 차트 그리기
});

// --- 1. 혈당 측정 및 분석 ---

async function updateGlucoseReading() {
    const glucoseInput = document.getElementById('glucose-input');
    const checkTimeSelect = document.getElementById('check-time-input');
    
    const glucose = parseInt(glucoseInput.value);
    const checkTime = checkTimeSelect.value;

    if (isNaN(glucose) || glucose < 30 || glucose > 600) {
        alert('올바른 혈당 값을 입력해주세요 (30 ~ 600)');
        return;
    }

    // 1. 화면에 즉각적인 피드백 표시
    updateGlucoseStatus(glucose, checkTime);
    updateGlucoseAnalysis(glucose, checkTime);

    // 2. Supabase에 데이터 저장 (수정됨)
    const success = await saveDiabetesLog(glucose, checkTime);

    if (success) {
        // 3. 저장 성공 시, 차트 다시 그리기
        await loadAndDrawGVChart();
        glucoseInput.value = ''; // 입력창 비우기
    } else {
        alert('데이터 저장에 실패했습니다. 다시 시도해주세요.');
    }
}

// (이하 updateGlucoseStatus, updateGlucoseAnalysis 함수는 기존과 동일)
function updateGlucoseStatus(glucose, checkTime) {
    const statusElement = document.getElementById('glucose-status');
    const statusIcon = statusElement.querySelector('i');
    const statusText = statusElement.querySelector('.status-text');
    const displayValue = document.getElementById('glucose-display-value');

    displayValue.textContent = glucose;
    statusElement.className = 'glucose-status';
    
    let status = 'normal';
    let icon = 'fa-check-circle';
    let text = '정상';

    if (checkTime === 'fasting') { // 공복
        if (glucose >= 126) { status = 'danger'; icon = 'fa-exclamation-triangle'; text = '고혈당 (당뇨)'; }
        else if (glucose >= 100) { status = 'warning'; icon = 'fa-exclamation-circle'; text = '공복혈당장애'; }
        else if (glucose < 70) { status = 'low'; icon = 'fa-info-circle'; text = '저혈당 의심'; }
    } else if (checkTime.includes('post_meal')) { // 식후
        if (glucose >= 200) { status = 'danger'; icon = 'fa-exclamation-triangle'; text = '고혈당 (당뇨)'; }
        else if (glucose >= 140) { status = 'warning'; icon = 'fa-exclamation-circle'; text = '내당능장애'; }
        else if (glucose < 70) { status = 'low'; icon = 'fa-info-circle'; text = '저혈당 의심'; }
    } else { // 식전, 취침 전 등
        if (glucose >= 200) { status = 'danger'; icon = 'fa-exclamation-triangle'; text = '고혈당'; }
        else if (glucose >= 140) { status = 'warning'; icon = 'fa-exclamation-circle'; text = '주의'; }
        else if (glucose < 70) { status = 'low'; icon = 'fa-info-circle'; text = '저혈당 의심'; }
    }

    statusElement.classList.add(status);
    statusIcon.className = `fas ${icon}`;
    statusText.textContent = text;
}
function updateGlucoseAnalysis(glucose, checkTime) {
    const analysisElement = document.getElementById('glucose-analysis-result');
    let text = '';
    
    if (checkTime === 'fasting' && glucose >= 126) {
        text = `<strong>고혈당 위험:</strong> 공복 혈당이 126 mg/dL 이상입니다. 전문의와 상담이 필요합니다.`;
    } else if (checkTime === 'fasting' && glucose >= 100) {
        text = `<strong>당뇨 전단계 (공복혈당장애):</strong> 공복 혈당이 100-125 mg/dL 범위입니다. 식단 관리와 운동이 필요합니다.`;
    } else if (glucose < 70) {
        text = `<strong>저혈당 의심:</strong> 혈당이 70 mg/dL 미만입니다. 즉시 주스나 사탕을 섭취하세요.`;
    } else {
        text = `현재 혈당은 관리 범위 내에 있습니다. 꾸준한 관리가 중요합니다.`;
    }
    
    analysisElement.innerHTML = `<p>${text}</p>`;
}


// --- 2. AI 식단 분석 (Mock-up) ---
// (이 섹션은 Supabase와 무관하므로 기존과 동일)
function previewMealImage(event) {
    const reader = new FileReader();
    reader.onload = function(){
        const preview = document.getElementById('meal-preview');
        preview.src = reader.result;
    }
    reader.readAsDataURL(event.target.files[0]);
}
function analyzeMeal() {
    const imageInput = document.getElementById('meal-image-input');
    if (imageInput.files.length === 0) {
        alert('먼저 식단 사진을 업로드해주세요.');
        return;
    }

    const resultElement = document.getElementById('meal-analysis-result');
    const analyzeBtn = document.getElementById('analyze-meal-btn');

    // 1. 로딩 상태 표시
    resultElement.innerHTML = `
        <div class="loading-spinner"></div>
        <p style="text-align: center; margin-top: 15px;">AI가 식단을 분석 중입니다...</p>
        <p style="text-align: center;">(Google Vision API 연동 중...)</p>
    `;
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...';

    // 2. (발표용) API 호출 시뮬레이션
    setTimeout(() => {
        // 3. (가짜) 분석 완료 후 결과 표시
        const currentGlucose = parseInt(document.getElementById('glucose-display-value').textContent) || 100;
        
        const recognizedFood = "쌀밥(1공기), 김치찌개, 계란말이";
        const totalCarbs = 85; 
        const correctionFactor = 1.2; 
        const predictedIncrease = Math.round((totalCarbs * 0.5) * correctionFactor);
        const predictedGlucose = currentGlucose + predictedIncrease;

        let status = 'warning';
        let icon = 'fa-exclamation-circle';
        let title = '혈당 스파이크 주의';
        if (predictedIncrease > 60) { status = 'danger'; icon = 'fa-exclamation-triangle'; title = '고혈당 스파이크 위험'; }
        else if (predictedIncrease < 30) { status = 'normal'; icon = 'fa-check-circle'; title = '안전한 식단'; }

        resultElement.innerHTML = `
            <div class="meal-result-status ${status}">
                <i class="fas ${icon}"></i>
                <span>${title}</span>
            </div>
            <h3>AI 분석 요약</h3>
            <ul class="meal-result-list">
                <li><strong>인식된 음식:</strong> ${recognizedFood}</li>
                <li><strong>예상 탄수화물:</strong> 약 ${totalCarbs}g</li>
                <li><strong>예상 혈당 변화:</strong> <strong class="${status}">+${predictedIncrease} mg/dL</strong></li>
            </ul>
            <h3>예상 혈당 그래프</h3>
            <div class="simple-bar-chart">
                <div class="bar-item">
                    <span class="bar-value">${currentGlucose}</span>
                    <div class="bar" style="height: ${Math.min(currentGlucose * 0.7, 180)}px;"></div>
                    <span class="bar-label">현재 혈당</span>
                </div>
                <div class="bar-item bar-predicted">
                    <span class="bar-value">${predictedGlucose}</span>
                    <div class="bar ${status}" style="height: ${Math.min(predictedGlucose * 0.7, 180)}px;"></div>
                    <span class="bar-label">식사 2시간 후 예상</span>
                </div>
            </div>
            <p class="meal-result-recommendation">
                <strong>AI 제안:</strong> 탄수화물 비중이 높습니다. 쌀밥의 양을 반으로 줄이고 채소 반찬을 추가하세요.
            </p>
        `;
        
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> 이 식단 분석하기';

    }, 2500); 
}


// --- 3. 혈당 변동성(GV) 차트 ---
// (initializeGVChart 함수는 기존과 동일)
function initializeGVChart() {
    if (!Chart) return; 
    const ctx = document.getElementById('gv-chart-canvas').getContext('2d');
    
    const targetRangePlugin = {
        id: 'targetRange',
        beforeDatasetsDraw(chart, args, options) {
            const { ctx, chartArea: { left, right, top, bottom }, scales: { y } } = chart;
            const yMin = options.yMin || 70;
            const yMax = options.yMax || 180;
            
            const yMinPixel = y.getPixelForValue(yMin);
            const yMaxPixel = y.getPixelForValue(yMax);
            
            ctx.save();
            ctx.fillStyle = options.backgroundColor || 'rgba(56, 161, 105, 0.1)';
            ctx.fillRect(left, yMaxPixel, right - left, yMinPixel - yMaxPixel);
            ctx.restore();
        }
    };

    gvChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: '혈당 (mg/dL)',
                data: [], 
                borderColor: '#667eea',
                backgroundColor: '#667eea',
                tension: 0.1,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'yyyy-MM-dd HH:mm',
                        displayFormats: {
                            day: 'MM/dd'
                        }
                    },
                    title: {
                        display: true,
                        text: '측정 일시'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '혈당 (mg/dL)'
                    },
                    suggestedMin: 50,
                    suggestedMax: 200
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            return new Date(context[0].parsed.x).toLocaleString('ko-KR');
                        },
                        label: (context) => {
                            const d = context.raw;
                            return ` ${d.y} mg/dL (${d.check_time_ko})`;
                        }
                    }
                },
                targetRange: {
                    yMin: 70,
                    yMax: 180,
                    backgroundColor: 'rgba(56, 161, 105, 0.1)'
                }
            }
        },
        plugins: [targetRangePlugin] 
    });
}


// --- 4. Supabase 연동 ---

// [ 🚀 수정됨 ] Supabase에서 혈당 기록 불러와 차트에 그리기
async function loadAndDrawGVChart() {
    if (!gvChart) return; 

    try {
        // [수정] /api/ 대신 Supabase에서 직접 GET
        const { data: dbData, error } = await supabaseClient
            .from('diabetes_logs') // Supabase 테이블 이름
            .select('*')
            .order('created_at', { ascending: true }) // 시간순 정렬
            .limit(100); // 최근 100개
        
        if (error) throw error; // 에러 발생 시 중단

        // 차트 데이터 형식으로 변환
        const chartData = dbData.map(log => {
            let timeLabel = '';
            switch(log.check_time) {
                case 'fasting': timeLabel = '공복'; break;
                case 'pre_meal': timeLabel = '식전'; break;
                case 'post_meal_1hr': timeLabel = '식후 1시간'; break;
                case 'post_meal_2hr': timeLabel = '식후 2시간'; break;
                case 'before_sleep': timeLabel = '취침 전'; break;
                default: timeLabel = log.check_time;
            }
            return {
                x: new Date(log.created_at), // Supabase의 created_at 시간
                y: log.glucose,
                check_time_ko: timeLabel // 툴팁에 표시
            };
        });

        // 차트 데이터 업데이트
        gvChart.data.datasets[0].data = chartData;
        gvChart.update();

    } catch (error) {
        console.error("차트 로딩 중 오류:", error);
    }
}


// [ 🚀 수정됨 ] 혈당 데이터 저장 (POST)
async function saveDiabetesLog(glucose, checkTime) {
    try {
        // [수정] /api/ 대신 Supabase에 직접 POST
        const { error } = await supabaseClient
            .from('diabetes_logs') // Supabase 테이블 이름
            .insert([
                { 
                    glucose: glucose,       // 'glucose' 컬럼
                    check_time: checkTime   // 'check_time' 컬럼
                }
            ]);

        if (error) throw error; // 에러 발생 시 중단
        return true; // 성공 여부 (true/false) 반환

    } catch (error) {
        console.error("데이터 저장 중 오류:", error);
        return false;
    }
}


// --- 5. 모달 기능 (공통) ---
// (이 섹션은 Supabase와 무관하므로 기존과 동일)

function setupModal() {
    modal = document.getElementById('modal');
    modalContent = document.querySelector('.modal-content'); 
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }
    
    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    }
}

function closeModal() {
    if (modal) {
        modal.style.display = 'none';
        if (modalContent) {
            modalContent.classList.remove('modal-lg');
        }
    }
}

function openModal(content) {
    if (modal) {
        document.getElementById('modal-body').innerHTML = content;
        modal.style.display = 'block';
    }
}

function showInitialChecklist() {
    const content = `
        <h2><i class="fas fa-clipboard-list"></i> 내 건강정보 (AI 보정치)</h2>
        <p style="margin-bottom: 20px;">
            AI 식단 분석의 정확도를 높이기 위해 사용됩니다. (발표용 데모)
        </p>
        <div class="checklist-form">
            <div class="form-group">
                <label for="check-age">나이:</label>
                <input type="number" id="check-age" placeholder="예: 45">
            </div>
            <div class="form-group">
                <label for="check-gender">성별:</label>
                <select id="check-gender">
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                </select>
            </div>
            <div class="form-group">
                <label for="check-bmi">BMI:</label>
                <input type="number" id="check-bmi" placeholder="예: 24.5">
            </div>
            <div class="form-group">
                <label for="check-family">가족력 (당뇨):</label>
                <input type="checkbox" id="check-family">
            </div>
            <div class="form-group">
                <label for="check-exercise">운동 (주 3회 이상):</label>
                <input type="checkbox" id="check-exercise">
            </div>
            <div class="form-group">
                <label for="check-sleep">평균 수면시간:</label>
                <input type="number" id="check-sleep" placeholder="예: 6 (시간)">
            </div>
            <div class="form-group">
                <label for="check-stress">최근 스트레스 (높음):</label>
                <input type="checkbox" id="check-stress">
            </div>
            <button class="btn-primary" style="padding: 12px 20px; font-size: 1rem; cursor: pointer; width: 100%;" onclick="saveChecklist()">저장하기</button>
        </div>
    `;
    openModal(content);
    if (modalContent) {
        modalContent.classList.add('modal-lg');
    }
}
function saveChecklist() {
    alert("건강 정보가 저장되었습니다. (데모)");
    closeModal();
}
function showDiabetesInfo() {
    const content = `
        <h2><i class="fas fa-info-circle"></i> 당뇨병 핵심 정보</h2>
        
        <div style="margin: 20px 0;">
            <h3>혈당이란?</h3>
            <p>혈액 속에 포함된 포도당을 말하며, 우리 몸의 주된 에너지원입니다.</p>
        </div>
        
        <div style="margin: 20px 0;">
            <h3>혈당 분류 (대한당뇨병학회)</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr style="background: #f7fafc;">
                    <th style="border: 1px solid #e2e8f0; padding: 10px;">분류</th>
                    <th style="border: 1px solid #e2e8f0; padding: 10px;">공복 혈당</th>
                    <th style="border: 1px solid #e2e8f0; padding: 10px;">식후 2시간</th>
                </tr>
              _B_R_   <tr>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">정상</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">&lt; 100</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">&lt; 140</td>
                </tr>
                <tr style="background: #f7fafc;">
nbsp;                 <td style="border: 1px solid #e2e8f0; padding: 10px;">당뇨 전단계</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">100-125</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">140-199</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">당뇨병</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">≥ 126</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">≥ 200</td>
                </tr>
            </table>
        </div>

        <div style="margin: 20px 0;">
            <h3>혈당 변동성 (GV)</h3>
            <p>혈당이 안정적이지 않고 높낮이가 심하게 변하는 것을 의미합니다. <strong>'혈당 스파이크'</strong>는 평균 혈당이 정상이라도 심혈관 합병증의 위험을 크게 높일 수 있습니다.</p>
        </div>
    `;
    openModal(content);
}
