async function testGasUpload() {
  const url = 'https://script.google.com/macros/s/AKfycbyyKbBPBK0r8XETDrBaSpJ5KCt4k91IJaD_rEKmto9tzasQWgvWTqNP0SBy8G0-fyc/exec';
  
  const testPayload = {
    action: 'uploadFile',
    fileData: Buffer.from('สวัสดีครับ นี่คือไฟล์ทดสอบระบบส่งงาน School Work Club อัตโนมัติ').toString('base64'),
    fileName: 'ทดสอบส่งงาน_ครูกฤตพจน์.txt',
    mimeType: 'text/plain',
    category: 'ฝ่ายวิชาการ',
    taskTitle: 'ทดสอบส่งแผนการสอน ภาคเรียนที่ 1/2569',
    teacherName: 'ครูกฤตพจน์',
    subtaskTitle: 'งานย่อยที่ 1: แผนสัปดาห์ 1-4',
    masterFolderId: '1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i'
  };

  console.log('Testing upload to Google Apps Script Web App...');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(testPayload),
      redirect: 'follow'
    });

    const data = await res.json();
    console.log('GAS Response Status:', res.status);
    console.log('GAS Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test error:', err);
  }
}

testGasUpload();
