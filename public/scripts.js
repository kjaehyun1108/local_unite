// 전역 변수
let currentECG = null;
let ecgCanvas = null;
let ecgContext = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeECG();
    setupModal();
});

// 심전도 초기화
function initializeECG() {
    ecgCanvas = document.getElementById('ecg-canvas');
    ecgContext = ecgCanvas.getContext('2d');
    
    // 캔버스 크기 조정
    const container = ecgCanvas.parentElement;
    const containerWidth = container.offsetWidth - 40;
    ecgCanvas.width = containerWidth;
    ecgCanvas.height = 200;
    
    // 초기 심전도 그리기
    drawECGPlaceholder();
}

// 심전도 플레이스홀더 그리기
function drawECGPlaceholder() {
    const ctx = ecgContext;
    const width = ecgCanvas.width;
    const height = ecgCanvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // 격자 그리기
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    
    // 세로 격자
    for (let x = 0; x <= width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // 가로 격자
    for (let y = 0; y <= height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // 안내 텍스트
    ctx.fillStyle = '#a0aec0';
    ctx.font = '16px Noto Sans KR';
    ctx.textAlign = 'center';
    ctx.fillText('심전도를 생성하고 분석해보세요', width / 2, height / 2);
}

// 심전도 생성
function generateECG() {
    const width = ecgCanvas.width;
    const height = ecgCanvas.height;
    const ctx = ecgContext;
    
    ctx.clearRect(0, 0, width, height);
    
    // 격자 그리기
    drawGrid();
    
    // 심전도 파형 생성
    const data = generateECGData(width);
    
    // 파형 그리기
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
        const x = i;
        const y = height / 2 + data[i];
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    // 현재 심전도 데이터 저장
    currentECG = data;
    
    // 결과 업데이트
    document.getElementById('ecg-result').innerHTML = '<p>심전도가 생성되었습니다. 분석을 진행해주세요.</p>';
}

// 심전도 데이터 생성
function generateECGData(width) {
    const data = [];
    const amplitude = 30;
    const frequency = 0.02;
    
    for (let x = 0; x < width; x++) {
        // 기본 사인파
        let y = amplitude * Math.sin(frequency * x * 2 * Math.PI);
        
        // P파 추가
        if (x > 100 && x < 150) {
            y += 15 * Math.exp(-Math.pow((x - 125) / 10, 2));
        }
        
        // QRS 복합체 추가
        if (x > 200 && x < 250) {
            y += 40 * Math.exp(-Math.pow((x - 225) / 8, 2));
        }
        
        // T파 추가
        if (x > 300 && x < 350) {
            y += 20 * Math.exp(-Math.pow((x - 325) / 12, 2));
        }
        
        // 노이즈 추가
        y += (Math.random() - 0.5) * 5;
        
        data.push(y);
    }
    
    return data;
}

// 격자 그리기
function drawGrid() {
    const ctx = ecgContext;
    const width = ecgCanvas.width;
    const height = ecgCanvas.height;
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    
    // 세로 격자
    for (let x = 0; x <= width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // 가로 격자
    for (let y = 0; y <= height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

// 심전도 분석
function analyzeECG() {
    if (!currentECG) {
        document.getElementById('ecg-result').innerHTML = '<p style="color: #e53e3e;">먼저 심전도를 생성해주세요.</p>';
        return;
    }
    
    // 간단한 분석 (실제로는 더 복잡한 알고리즘 사용)
    const analysis = performECGAnalysis(currentECG);
    
    let resultHTML = '<h3>심전도 분석 결과</h3>';
    resultHTML += `<p><strong>심박수:</strong> ${analysis.heartRate} BPM</p>`;
    resultHTML += `<p><strong>리듬:</strong> ${analysis.rhythm}</p>`;
    resultHTML += `<p><strong>진단:</strong> ${analysis.diagnosis}</p>`;
    resultHTML += `<p><strong>권장사항:</strong> ${analysis.recommendation}</p>`;
    
    document.getElementById('ecg-result').innerHTML = resultHTML;
}

// 심전도 분석 수행
function performECGAnalysis(ecgData) {
    // 간단한 분석 로직 (실제로는 더 정교한 알고리즘 필요)
    const dataLength = ecgData.length;
    const peaks = countPeaks(ecgData);
    const heartRate = Math.round((peaks / (dataLength / 800)) * 60); // 800px = 약 1초
    
    let rhythm = '정상';
    let diagnosis = '정상 심전도';
    let recommendation = '정기적인 건강검진을 권장합니다.';
    
    if (heartRate > 100) {
        rhythm = '빈맥';
        diagnosis = '빈맥 의심';
        recommendation = '의료진과 상담이 필요합니다.';
    } else if (heartRate < 60) {
        rhythm = '서맥';
        diagnosis = '서맥 의심';
        recommendation = '의료진과 상담이 필요합니다.';
    }
    
    return {
        heartRate: heartRate,
        rhythm: rhythm,
        diagnosis: diagnosis,
        recommendation: recommendation
    };
}

// 피크 개수 세기
function countPeaks(data) {
    let peaks = 0;
    const threshold = 20;
    
    for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i-1] && data[i] > data[i+1]) {
            peaks++;
        }
    }
    
    return peaks;
}

// 혈압 업데이트
function updateBloodPressure() {
    const systolic = parseInt(document.getElementById('systolic-input').value);
    const diastolic = parseInt(document.getElementById('diastolic-input').value);
    
    if (isNaN(systolic) || isNaN(diastolic)) {
        alert('올바른 혈압 값을 입력해주세요.');
        return;
    }
    
    if (systolic < 70 || systolic > 300 || diastolic < 40 || diastolic > 200) {
        alert('혈압 값이 범위를 벗어났습니다.');
        return;
    }
    
    // 혈압 표시 업데이트
    document.getElementById('systolic').textContent = systolic;
    document.getElementById('diastolic').textContent = diastolic;
    
    // 혈압 상태 평가 및 표시
    updateBloodPressureStatus(systolic, diastolic);
    
    // 입력 필드 초기화
    document.getElementById('systolic-input').value = '';
    document.getElementById('diastolic-input').value = '';
}

// 혈압 상태 업데이트
function updateBloodPressureStatus(systolic, diastolic) {
    const statusElement = document.getElementById('bp-status');
    const statusText = statusElement.querySelector('.status-text');
    const statusIcon = statusElement.querySelector('i');
    
    // 기존 클래스 제거
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

// 증상 체크리스트 확인
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

// 모달 설정
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

// 상세 예방법 보기
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

// 119 신고
function callEmergency() {
    if (confirm('119에 신고하시겠습니까?\n\n긴급 상황이 아닌 경우 일반 상담을 이용해주세요.')) {
        // 실제로는 119 연결 로직 구현
        alert('119 신고가 연결되었습니다.\n\n위치: 현재 위치\n증상: 고혈압 관련 증상\n\n응급차가 출동합니다.');
        
        // 모달로 응급 상황 안내
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
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>안전한 장소에서 대기</li>
                    <li>갑작스러운 움직임 자제</li>
                    <li>증상 악화 시 즉시 재연락</li>
                </ul>
            </div>
        `;
        
        modal.style.display = 'block';
    }
}

// 건강 정보 보기
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

// 윈도우 리사이즈 시 심전도 캔버스 크기 조정
window.addEventListener('resize', function() {
    if (ecgCanvas) {
        const container = ecgCanvas.parentElement;
        const containerWidth = container.offsetWidth - 40;
        ecgCanvas.width = containerWidth;
        ecgCanvas.height = 200;
        
        if (currentECG) {
            generateECG();
        } else {
            drawECGPlaceholder();
        }
    }

});

async function loadHeartBeats() {
  const res = await fetch("/api/heart_beat");
  const data = await res.json();
  console.log(data);
};
