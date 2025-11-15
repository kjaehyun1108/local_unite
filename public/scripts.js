// --- [ 🚀 1. Supabase 클라이언트 설정 ] ---
// (본인의 URL과 Anon Key로 수정하세요)
const SUPABASE_URL = 'https://ttselmicsanmajuxeajq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0c2VsbWljc2FubWFqdXhlYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTUyNDIsImV4cCI6MjA3Nzg3MTI0Mn0.-5djDYUwPCOmAi50sgyCrH65uBsnQoMLGUdJYxRjt5s';

// [수정] CDN의 'supabase' 객체를 사용하여 'supabaseClient'라는 새 변수를 만듭니다.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 전역 변수로 차트 객체, 모달 객체 선언
let bpChart = null;
let modal = null;
let modalContent = null;

// --- [ 🚀 2. 페이지 로드 시 실행 ] ---
document.addEventListener('DOMContentLoaded', function() {
    // 모달 기능 초기화
    setupModal(); 
    
    // 실시간 차트 초기화
    initializeRealtimeChart();
    
    // Supabase에서 초기 데이터 로드
    loadInitialData();
    
    // Supabase 실시간 구독 시작
    subscribeToNewData();
});

// --- [ 🚀 3. 실시간 차트 초기화 ] ---
function initializeRealtimeChart() {
    const chartElement = document.getElementById('bpChart');
    if (!chartElement) {
        console.error("차트를 그릴 <canvas id='bpChart'> 요소를 찾을 수 없습니다.");
        return;
    }
    const ctx = chartElement.getContext('2d');
    
    bpChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: [], 
            datasets: [
                {
                    label: '수축기 혈압 (SBP)',
                    data: [], 
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    tension: 0.1
                },
                {
                    label: '이완기 혈압 (DBP)',
                    data: [], 
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    tension: 0.1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                    suggestedMin: 50, 
                    suggestedMax: 160 
                }
            },
            animation: {
                duration: 200 
            }
        }
    });
}

// --- [ 🚀 4. 새 데이터를 차트와 화면에 업데이트 ] ---
function updateChartAndDisplay(newData) {
    if (!newData || newData.systolic === undefined) return;

    // 1. 상단 "현재 혈압" 업데이트
    document.getElementById('systolic').textContent = newData.systolic;
    document.getElementById('diastolic').textContent = newData.diastolic;
    
    // 2. 혈압 상태(정상, 고혈압 등) 업데이트
    updateBloodPressureStatus(newData.systolic, newData.diastolic);

    // 3. 차트 레이블(X축)에 시간 추가
    const timeLabel = new Date(newData.created_at).toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    if (bpChart) {
        bpChart.data.labels.push(timeLabel);
        
        // 4. 차트 데이터셋(Y축)에 SBP, DBP 값 추가
        bpChart.data.datasets[0].data.push(newData.systolic);
        bpChart.data.datasets[1].data.push(newData.diastolic);

        // 5. 차트에 데이터가 너무 많아지지 않도록 조절 (최대 30개)
        const maxDataPoints = 30;
        if (bpChart.data.labels.length > maxDataPoints) {
            bpChart.data.labels.shift(); 
            bpChart.data.datasets.forEach(dataset => {
                dataset.data.shift(); 
            });
        }

        // 6. 차트 다시 그리기
        bpChart.update();
    }
}

// --- [ 🚀 5. (최초 로드) 기존 데이터 불러오기 ] ---
async function loadInitialData() {
    const { data, error } = await supabaseClient
        .from('heart_beat_ai')
        .select('*')
        .order('created_at', { ascending: false }) 
        .limit(30); 

    if (error) {
        console.error('데이터 로드 실패:', error);
        return;
    }

    const sortedData = data.reverse();

    if (bpChart) {
        sortedData.forEach(record => {
            const timeLabel = new Date(record.created_at).toLocaleTimeString('ko-KR', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            bpChart.data.labels.push(timeLabel);
            bpChart.data.datasets[0].data.push(record.systolic);
            bpChart.data.datasets[1].data.push(record.diastolic);
        });
        bpChart.update(); 
    }
    
    if (sortedData.length > 0) {
        const latestData = sortedData[sortedData.length - 1];
        updateChartAndDisplay(latestData); // 상단 표시 업데이트
    }
}

// --- [ 🚀 6. (실시간) Supabase Realtime 구독 ] ---
function subscribeToNewData() {
    supabaseClient.channel('heartbeat_channel') 
        .on(
            'postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'heart_beat_ai' 
            },
            (payload) => {
                console.log('새 데이터 수신!', payload.new);
                updateChartAndDisplay(payload.new);
            }
        )
        .subscribe();
    
    console.log('Supabase 실시간 구독 시작...');
}


// --- [ 7. 고혈압 전용 함수들 ] ---

function updateBloodPressureStatus(systolic, diastolic) {
    const statusElement = document.getElementById('bp-status');
    if (!statusElement) return;
    const statusText = statusElement.querySelector('.status-text');
    const statusIcon = statusElement.querySelector('i');
    
    statusElement.className = 'bp-status'; 
    
    let status = '';
    let iconClass = '';
    let colorClass = '';
    
    if (systolic >= 180 || diastolic >= 110) {
        status = '고혈압 위험';
        iconClass = 'fas fa-exclamation-triangle';
        colorClass = 'high';
    } else if (systolic >= 140 || diastolic >= 90) {
        status = '고혈압';
        iconClass = 'fas fa-exclamation-circle';
        colorClass = 'high';
    } else if (systolic >= 130 || diastolic >= 80) {
        status = '고혈압 전단계';
        iconClass = 'fas fa-exclamation-circle';
        colorClass = 'pre-high';
    } else if (systolic >= 90 && diastolic >= 60) {
        status = '정상';
        iconClass = 'fas fa-check-circle';
        colorClass = 'normal';
    } else {
        status = '저혈압';
        iconClass = 'fas fa-info-circle';
        colorClass = 'low';
    }
    
    statusText.textContent = status;
    statusIcon.className = iconClass; 
    statusElement.classList.add(colorClass); 
}

function checkSymptoms() {
    const symptoms = [
        'headache', 'dizziness', 'chest-pain', 'shortness-breath',
        'nosebleed', 'vision-problems', 'irregular-heartbeat', 'anxiety'
    ];
    
    let checkedCount = 0;
    let severeSymptoms = [];
    
    symptoms.forEach(symptom => {
        const el = document.getElementById(symptom);
        if (el && el.checked) {
            checkedCount++;
            if (['chest-pain', 'shortness-breath', 'irregular-heartbeat'].includes(symptom)) {
                severeSymptoms.push(symptom);
            }
        } 
    });
    
    const resultElement = document.getElementById('symptoms-result');
    if (!resultElement) return;
    
    if (checkedCount === 0) {
        resultElement.innerHTML = '<p>증상을 체크해주세요.</p>';
    } else if (severeSymptoms.length > 0) {
        resultElement.innerHTML = `
            <p style="color: #e53e3e; font-weight: bold;">
                <i class="fas fa-exclamation-triangle"></i> 
                심각한 증상이 감지되었습니다. 즉시 의료진과 상담하세요!
            </p>
            <p>체크된 증상: ${checkedCount}개</p>
        `;
    } else if (checkedCount >= 5) {
        resultElement.innerHTML = `
            <p style="color: #ed8936; font-weight: bold;">
                <i class="fas fa-exclamation-circle"></i> 
                고혈압 의심 증상이 많습니다. 의료진과 상담을 권장합니다.
            </p>
            <p>체크된 증상: ${checkedCount}개</p>
        `;
    } else {
        resultElement.innerHTML = `
            <p style="color: #38a169;">
                <i class="fas fa-check-circle"></i> 
                증상이 적습니다. 정기적인 혈압 측정을 권장합니다.
            </p>
            <p>체크된 증상: ${checkedCount}개</p>
        `;
    }
}


// ==========================================================
//   ▼▼▼ [ 🚀 8. 공통 모달 함수 (중앙 모달 방식) ] ▼▼▼
// ==========================================================
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

// (고혈압 페이지 전용 모달 함수들)
function showPreventionTips() {
    const content = `
        <h2><i class="fas fa-lightbulb"></i> 고혈압 예방 상세 가이드</h2>
        <div style="margin: 20px 0;">
            <h3><i class="fas fa-utensils"></i> 식이 관리</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>나트륨 섭취를 하루 2,300mg 이하로 제한</li>
                <li>DASH 다이어트: 과일, 채소, 저지방 유제품, 견과류</li>
                <li>포화지방과 콜레스테롤 섭취 줄이기</li>
            </ul>
        </div>
        <div style="margin: 20px 0;">
            <h3><i class="fas fa-running"></i> 운동 가이드</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>주 3-4회, 30-45분 유산소 운동</li>
                <li>걷기, 수영, 자전거, 조깅 등</li>
            </ul>
        </div>
    `;
    openModal(content);
}

function callEmergency() {
    if (confirm('119에 신고하시겠습니까?\n\n긴급 상황이 아닌 경우 일반 상담을 이용해주세요.')) {
        alert('119 신고가 연결되었습니다.\n\n응급차가 출동합니다.');
    }
}

function showHealthInfo() {
    const content = `
        <h2><i class="fas fa-info-circle"></i> 고혈압 건강 정보</h2>
        <div style="margin: 20px 0;">
            <h3>혈압 분류</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr style="background: #f7fafc;">
                    <th style="border: 1px solid #e2e8f0; padding: 10px;">분류</th>
                    <th style="border: 1px solid #e2e8f0; padding: 10px;">수축기</th>
                    <th style="border: 1px solid #e2e8f0; padding: 10px;">이완기</th>
                </tr>
                <tr>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">정상</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">&lt; 120</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">&lt; 80</td>
                </tr>
                <tr style="background: #f7fafc;">
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">고혈압 전단계</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">120-139</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">80-89</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">고혈압 1단계</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">140-159</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">90-99</td>
                </tr>
            </table>
        </div>
    `;
    openModal(content);
}
