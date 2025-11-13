// --- [ 🚀 1. Supabase 클라이언트 설정 ] ---
// (본인의 URL과 Anon Key로 수정하세요)
const SUPABASE_URL = 'https://ttselmicsanmajuxeajq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0c2VsbWljc2FubWFqdXhlYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTUyNDIsImV4cCI6MjA3Nzg3MTI0Mn0.-5djDYUwPCOmAi50sgyCrH65uBsnQoMLGUdJYxRjt5s';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 전역 변수로 차트 객체 선언
let bpChart = null;

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
    const ctx = document.getElementById('bpChart').getContext('2d');
    bpChart = new Chart(ctx, {
        type: 'line', // 라인 차트
        data: {
            labels: [], // X축 (시간)
            datasets: [
                {
                    label: '수축기 혈압 (SBP)',
                    data: [], // Y축 (SBP 값)
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    tension: 0.1
                },
                {
                    label: '이완기 혈압 (DBP)',
                    data: [], // Y축 (DBP 값)
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
                    suggestedMin: 50, // Y축 최소값
                    suggestedMax: 160 // Y축 최대값
                }
            },
            animation: {
                duration: 200 // 부드러운 업데이트
            }
        }
    });
}

// --- [ 🚀 4. (중요) 새 데이터를 차트와 화면에 업데이트하는 함수 ] ---
function updateChartAndDisplay(newData) {
    // 1. 상단 "현재 혈압" 업데이트
    document.getElementById('systolic').textContent = newData.systolic;
    document.getElementById('diastolic').textContent = newData.diastolic;
    
    // 2. 혈압 상태(정상, 고혈압 등) 업데이트
    updateBloodPressureStatus(newData.systolic, newData.diastolic);

    // 3. 차트 레이블(X축)에 시간 추가
    const timeLabel = new Date(newData.created_at).toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    bpChart.data.labels.push(timeLabel);
    
    // 4. 차트 데이터셋(Y축)에 SBP, DBP 값 추가
    bpChart.data.datasets[0].data.push(newData.systolic);
    bpChart.data.datasets[1].data.push(newData.diastolic);

    // 5. 차트에 데이터가 너무 많아지지 않도록 조절 (최대 30개)
    const maxDataPoints = 30;
    if (bpChart.data.labels.length > maxDataPoints) {
        bpChart.data.labels.shift(); // 가장 오래된 레이블 제거
        bpChart.data.datasets.forEach(dataset => {
            dataset.data.shift(); // 가장 오래된 데이터 제거
        });
    }

    // 6. 차트 다시 그리기!
    bpChart.update();
}

// --- [ 🚀 5. (최초 로드) 페이지가 열릴 때 기존 데이터 불러오기 ] ---
async function loadInitialData() {
    // DB에서 최근 30개 데이터를 'created_at' (오래된 순)으로 가져오기
    const { data, error } = await supabase
        .from('heart_beat_ai')
        .select('*')
        .order('created_at', { ascending: false }) // [수정] 최신순으로 가져오기
        .limit(30); // 30개만

    if (error) {
        console.error('데이터 로드 실패:', error);
        return;
    }

    // 가져온 데이터를 (오래된 순)으로 다시 뒤집기 (차트에 순서대로 그리려고)
    const sortedData = data.reverse();

    // 기존 데이터를 차트에 한 번에 그리기
    sortedData.forEach(record => {
        const timeLabel = new Date(record.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        bpChart.data.labels.push(timeLabel);
        bpChart.data.datasets[0].data.push(record.systolic);
        bpChart.data.datasets[1].data.push(record.diastolic);
    });
    
    // [중요] 가장 마지막(최신) 데이터로 상단 표시 업데이트
    if (sortedData.length > 0) {
        const latestData = sortedData[sortedData.length - 1];
        document.getElementById('systolic').textContent = latestData.systolic;
        document.getElementById('diastolic').textContent = latestData.diastolic;
        updateBloodPressureStatus(latestData.systolic, latestData.diastolic);
    }
    
    bpChart.update(); // 차트 최종 업데이트
}

// --- [ 🚀 6. (실시간) Supabase Realtime 구독 ] ---
function subscribeToNewData() {
    supabase.channel('heartbeat_channel') // 채널 이름 (자유롭게 지정)
        .on(
            'postgres_changes', // DB 변경 사항 감지
            { 
                event: 'INSERT', // "INSERT" 이벤트만 감지
                schema: 'public', 
                table: 'heart_beat_ai' // 'heart_beat_ai' 테이블 감시
            },
            (payload) => {
                console.log('새 데이터 수신!', payload.new);
                // payload.new 에 방금 INSERT된 새 데이터가 들어있습니다.
                updateChartAndDisplay(payload.new);
            }
        )
        .subscribe();
    
    console.log('Supabase 실시간 구독 시작...');
}


// ==========================================================
//   ▼▼▼ 기존 `scripts.js`에 있던 함수들 (재사용) ▼▼▼
// ==========================================================

// [재사용] 혈압 상태 업데이트 (수정됨: 아이콘 클래스 수정)
function updateBloodPressureStatus(systolic, diastolic) {
    const statusElement = document.getElementById('bp-status');
    const statusText = statusElement.querySelector('.status-text');
    const statusIcon = statusElement.querySelector('i');
    
    statusElement.className = 'bp-status'; // 기존 클래스 리셋
    
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
    statusIcon.className = iconClass; // 아이콘 클래스 변경
    statusElement.classList.add(colorClass); // 색상 클래스 추가
}

// [재사용] 증상 체크리스트 확인
function checkSymptoms() {
    const symptoms = [
        'headache', 'dizziness', 'chest-pain', 'shortness-breath',
        'nosebleed', 'vision-problems', 'irregular-heartbeat', 'anxiety'
    ];
    
    let checkedCount = 0;
    let severeSymptoms = [];
    
    symptoms.forEach(symptom => {
        if (document.getElementById(symptom).checked) {
            checkedCount++;
            if (['chest-pain', 'shortness-breath', 'irregular-heartbeat'].includes(symptom)) {
                severeSymptoms.push(symptom);
            }
        }
    });
    
    const resultElement = document.getElementById('symptoms-result');
    
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

// [재사용] 모달 설정
function setupModal() {
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// [재사용] 상세 예방법 보기
function showPreventionTips() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h2><i class="fas fa-lightbulb"></i> 고혈압 예방 상세 가이드</h2>
        
        <div style="margin: 20px 0;">
            <h3><i class="fas fa-utensils"></i> 식이 관리</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>나트륨 섭취를 하루 2,300mg 이하로 제한</li>
                <li>DASH 다이어트: 과일, 채소, 저지방 유제품, 견과류</li>
                <li>포화지방과 콜레스테롤 섭취 줄이기</li>
                <li>칼륨, 마그네슘, 칼슘 섭취 증가</li>
            </ul>
        </div>
        
        <div style="margin: 20px 0;">
            <h3><i class="fas fa-running"></i> 운동 가이드</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>주 3-4회, 30-45분 유산소 운동</li>
                <li>걷기, 수영, 자전거, 조깅 등</li>
                <li>중강도 운동: 대화가 가능한 수준</li>
                <li>점진적으로 운동 강도와 시간 증가</li>
            </ul>
        </div>
        
        <div style="margin: 20px 0;">
            <h3><i class="fas fa-weight"></i> 체중 관리</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>BMI 25 이하 유지</li>
                <li>복부 둘레: 남성 90cm, 여성 85cm 이하</li>
                <li>체중의 5-10% 감량으로도 혈압 개선</li>
                <li>균형 잡힌 식단과 규칙적인 운동</li>
            </ul>
        </div>
        
        <div style="margin: 20px 0;">
            <h3><i class="fas fa-bed"></i> 생활 습관</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>하루 7-8시간 충분한 수면</li>
                <li>스트레스 관리: 명상, 요가, 취미 활동</li>
                <li>금연 및 알코올 제한</li>
                <li>정기적인 혈압 측정 및 기록</li>
            </ul>
        </div>
    `;
    
    modal.style.display = 'block';
}

// [재사용] 119 신고
function callEmergency() {
    if (confirm('119에 신고하시겠습니까?\n\n긴급 상황이 아닌 경우 일반 상담을 이용해주세요.')) {
        alert('119 신고가 연결되었습니다.\n\n응급차가 출동합니다.');
        
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        modalBody.innerHTML = `
            <h2 style="color: #e53e3e;"><i class="fas fa-ambulance"></i> 응급 상황 안내</h2>
            <div style="margin: 20px 0; padding: 20px; background: #fed7d7; border-radius: 10px;">
                <h3>응급차 출동 중입니다</h3>
                <p><strong>예상 도착 시간:</strong> 5-10분</p>
                <p><strong>응급실 준비사항:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>증상 기록 준비</li>
                    <li>복용 중인 약물 목록</li>
                    <li>보험증 및 신분증</li>
                    <li>가족 연락처</li>
                </ul>
            </div>
            <div style="margin: 20px 0; padding: 20px; background: #c6f6d5; border-radius: 10px;">
                <h3>응급차 도착 전 안전 수칙</h3>
              _B_R_   <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>안전한 장소에서 대기</li>
                    <li>갑작스러운 움직임 자제</li>
                    <li>증상 악화 시 즉시 재연락</li>
                </ul>
            </div>
        `;
        
        modal.style.display = 'block';
    }
}

// [재사용] 건강 정보 보기
function showHealthInfo() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h2><i class="fas fa-info-circle"></i> 고혈압 건강 정보</h2>
        
        <div style="margin: 20px 0;">
            <h3>고혈압이란?</h3>
            <p>수축기 혈압 140mmHg 이상 또는 이완기 혈압 90mmHg 이상인 상태를 말합니다.</p>
        </div>
        
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
              _B_R_ </tr>
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
                <tr style="background: #f7fafc;">
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">고혈압 2단계</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">≥ 160</td>
                    <td style="border: 1px solid #e2e8f0; padding: 10px;">≥ 100</td>
                </tr>
            </table>
        </div>
        
        <div style="margin: 20px 0;">
            <h3>고혈압의 위험성</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>뇌졸중 위험 증가</li>
                <li>심장병 위험 증가</li>
                <li>신장 질환 위험 증가</li>
                <li>시력 손실 위험</li>
            </ul>
        </div>
        
        <div style="margin: 20px 0;">
            <h3>정기 검진 권장사항</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                <li>20세 이상: 2년마다 혈압 측정</li>
                <li>고혈압 전단계: 1년마다</li>
                <li>고혈압: 3-6개월마다</li>
                <li>65세 이상: 매년</li>
            </ul>
        </div>
    `;
    
    modal.style.display = 'block';
}

// [삭제] 윈도우 리사이즈 함수 (ECG용이었으므로 제거)
// [삭제] updateBloodPressure 함수 (수동 입력용이었으므로 제거)
// [삭제] loadHeartBeats 함수 (Supabase 로직으로 대체되었으므로 제거)
