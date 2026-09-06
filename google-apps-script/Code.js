/**
 * =========================================================================
 * School Work Club - Google Apps Script (Sent-File API)
 * ระบบจัดเก็บและจัดการโครงสร้างโฟลเดอร์ Google Drive โรงเรียนอัตโนมัติ
 * =========================================================================
 * 
 * โครงสร้างโฟลเดอร์ที่จะถูกสร้างใน Google Drive อัตโนมัติ:
 * [Master Folder: โฟลเดอร์รวมโรงเรียน]
 *    └── [หมวดหมู่/กลุ่มสาระฯ เช่น ฝ่ายวิชาการ หรือ กลุ่มสาระการเรียนรู้วิทยาศาสตร์]
 *         └── [ชื่อภาระงาน เช่น ส่งแผนการสอน ประจำภาคเรียนที่ 1/2569]
 *              └── [ชื่อครูผู้ส่งงาน เช่น ครูกฤตพจน์]
 *                   └── [ไฟล์งานย่อย / ไฟล์ผลงาน]
 */

// โฟลเดอร์ Master หลักของโรงเรียน (สามารถเปลี่ยนแปลงได้ตามที่ตั้งค่าในระบบ)
var DEFAULT_MASTER_FOLDER_ID = '1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i';

/**
 * ทดสอบการทำงานของ Web App (เปิดดูผ่าน Browser ได้โดยตรง)
 */
function doGet(e) {
  var response = {
    status: 'ok',
    service: 'School Work Club - Google Apps Script Drive API',
    masterFolderId: DEFAULT_MASTER_FOLDER_ID,
    timestamp: new Date().toISOString(),
    message: 'API พร้อมใช้งานสำหรับการสร้างโฟลเดอร์และอัปโหลดไฟล์'
  };

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * รับคำขออัปโหลดไฟล์และสร้างโครงสร้างโฟลเดอร์อัตโนมัติ
 */
function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : '';
    if (!rawData) {
      return createJsonResponse({ success: false, error: 'ไม่พบข้อมูลที่ส่งมา (Empty payload)' });
    }

    var data;
    try {
      data = JSON.parse(rawData);
    } catch (parseErr) {
      // ลองถอดรหัสกรณีส่งเป็น Form-urlencoded หรือ parameter
      if (e.parameter && e.parameter.fileData) {
        data = e.parameter;
      } else {
        return createJsonResponse({ success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง: ' + parseErr.toString() });
      }
    }

    var action = data.action || 'uploadFile';

    if (action === 'uploadFile') {
      return handleFileUpload(data);
    } else if (action === 'ping') {
      return createJsonResponse({ success: true, message: 'Pong! Connection verified.' });
    } else {
      return createJsonResponse({ success: false, error: 'Action ที่ร้องขอไม่ถูกต้อง: ' + action });
    }

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: 'เกิดข้อผิดพลาดในการประมวลผล: ' + err.toString()
    });
  }
}

/**
 * จัดการอัปโหลดไฟล์และสร้างโฟลเดอร์ตามลำดับชั้น
 */
function handleFileUpload(data) {
  var fileData = data.fileData;       // Base64 string
  var fileName = data.fileName || 'unnamed_file';
  var mimeType = data.mimeType || 'application/octet-stream';
  var category = (data.category || 'งานทั่วไป').trim();
  var taskTitle = (data.taskTitle || 'ภาระงานทั่วไป').trim();
  var teacherName = (data.teacherName || 'บุคลากรทั่วไป').trim();
  var subtaskTitle = (data.subtaskTitle || '').trim();
  var masterFolderId = data.masterFolderId || DEFAULT_MASTER_FOLDER_ID;

  if (!fileData) {
    return createJsonResponse({ success: false, error: 'ไม่พบข้อมูลไฟล์ (fileData is required)' });
  }

  // 1. เข้าถึง Master Folder
  var masterFolder;
  try {
    masterFolder = DriveApp.getFolderById(masterFolderId);
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: 'ไม่สามารถเปิด Master Folder ID: ' + masterFolderId + ' (' + err.toString() + ')'
    });
  }

  // 2. หาหรือสร้างโฟลเดอร์หมวดหมู่ (Category Folder)
  var categoryFolder = getOrCreateSubFolder(masterFolder, category);

  // 3. หาหรือสร้างโฟลเดอร์ภาระงาน (Task Folder)
  var taskFolder = getOrCreateSubFolder(categoryFolder, taskTitle);

  // 4. หาหรือสร้างโฟลเดอร์คุณครู (Teacher Folder)
  var teacherFolder = getOrCreateSubFolder(taskFolder, teacherName);

  // 5. เตรียมชื่อไฟล์ (ถ้ามีงานย่อย ให้ใส่ระบุงานย่อยข้างหน้าเพื่อความเป็นระเบียบ)
  var cleanFileName = fileName;
  if (subtaskTitle) {
    // ปรับแต่งชื่อไฟล์ให้รู้ว่ามาจากงานย่อยข้อใด เช่น [งานย่อย: แผนสัปดาห์ 1] แผนการสอน.pdf
    var prefix = '[' + subtaskTitle.replace(/[/\\?%*:|"<>]/g, '_') + '] ';
    if (!cleanFileName.startsWith(prefix)) {
      cleanFileName = prefix + cleanFileName;
    }
  }

  // 6. แปลง Base64 เป็น Blob และบันทึกไฟล์ลงโฟลเดอร์ครู
  var decodedBytes = Utilities.base64Decode(fileData);
  var blob = Utilities.newBlob(decodedBytes, mimeType, cleanFileName);
  var createdFile = teacherFolder.createFile(blob);

  // 7. กำหนดสิทธิ์ให้ผู้ที่มีลิงก์สามารถดูและดาวน์โหลดได้
  try {
    createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {
    // กรณีบัญชีโดเมนปิดกั้นการแชร์สาธารณะ ให้ข้ามไป
  }

  // 8. ส่งผลลัพธ์กลับ
  var result = {
    success: true,
    fileId: createdFile.getId(),
    fileName: createdFile.getName(),
    fileUrl: createdFile.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + createdFile.getId(),
    size: createdFile.getSize(),
    folder: {
      id: teacherFolder.getId(),
      name: teacherFolder.getName(),
      url: teacherFolder.getUrl()
    },
    hierarchy: {
      master: masterFolder.getName(),
      category: categoryFolder.getName(),
      task: taskFolder.getName(),
      teacher: teacherFolder.getName()
    },
    uploadedAt: new Date().toISOString()
  };

  return createJsonResponse(result);
}

/**
 * ค้นหาโฟลเดอร์ย่อย หากยังไม่มีให้สร้างขึ้นใหม่ทันที
 */
function getOrCreateSubFolder(parentFolder, folderName) {
  if (!folderName || !folderName.trim()) {
    return parentFolder;
  }
  var cleanName = folderName.trim();
  var folders = parentFolder.getFoldersByName(cleanName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(cleanName);
}

/**
 * Helper คืนค่า JSON พร้อม Header CORS สำหรับ Web App
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
