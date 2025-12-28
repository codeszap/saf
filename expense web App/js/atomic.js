const inputs = [
    'inIdentity', 'inCueExisting', 'inCueNew',
    'inCravingNeed', 'inCravingWant',
    'inResponseEasy', 'inReward'
];

function loadData() {
    const data = JSON.parse(localStorage.getItem('atomic_draft') || '{}');
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el && data[id]) el.value = data[id];
    });
}

function detectChanges() {
    const banner = document.querySelector('.save-banner');
    if (!banner) return;
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                banner.classList.add('show');
            });
        }
    });
}

function saveAtomicHabit() {
    const data = {};
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });
    localStorage.setItem('atomic_draft', JSON.stringify(data));

    // Generate and Show Certificate
    generateCertificate(data.inIdentity);
}

function generateCertificate(identityText) {
    const canvas = document.getElementById('certCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Set high resolution
    canvas.width = 1200;
    canvas.height = 800;

    // Background
    const grd = ctx.createLinearGradient(0, 0, 1200, 800);
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(1, "#f3f4f6");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1200, 800);

    // Border
    ctx.strokeStyle = "#4f46e5"; // Indigo
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, 1120, 720);

    // Inner Border (Gold)
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 5;
    ctx.strokeRect(70, 70, 1060, 660);

    // Title
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 60px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CERTIFICATE OF COMMITMENT", 600, 180);

    // Subtitle
    ctx.font = "italic 30px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("This certifies that", 600, 250);

    // Name/Identity Logic
    const identity = identityText || "A DEDICATED ACHIEVER";

    // Identity Display
    ctx.fillStyle = "#4f46e5";
    ctx.font = "800 50px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(identity.toUpperCase(), 600, 350);

    // Divider Line
    ctx.beginPath();
    ctx.moveTo(400, 380);
    ctx.lineTo(800, 380);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tanglish Quote
    ctx.fillStyle = "#334155";
    ctx.font = "italic 500 32px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Has officially decided to change their identity.", 600, 450);
    ctx.fillStyle = "#059669"; // Green
    ctx.font = "bold 36px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Wait pannadhu podhum. Action edukra neram idhu!", 600, 520);

    // Date
    const date = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    ctx.fillStyle = "#94a3b8";
    ctx.font = "24px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(`Dated: \${date}`, 600, 650);

    // Logo/Watermark (Simple Circle for now)
    ctx.beginPath();
    ctx.arc(600, 600, 50, 0, 2 * Math.PI);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("PRO", 600, 595);
    ctx.fillText("CHECK", 600, 615);

    // Show Modal
    new bootstrap.Modal(document.getElementById('certificateModal')).show();
}

function downloadCertificate() {
    const canvas = document.getElementById('certCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'My_Commitment.png';
    link.href = canvas.toDataURL();
    link.click();
}

window.onload = () => {
    loadData();
    detectChanges();
};
