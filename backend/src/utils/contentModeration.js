const Core = require('@alicloud/pop-core');

let client = null;

const initClient = () => {
  if (!client && process.env.ALIBABA_ACCESS_KEY_ID && process.env.ALIBABA_ACCESS_KEY_SECRET) {
    client = new Core({
      accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
      endpoint: 'https://green.cn-shanghai.aliyuncs.com',
      apiVersion: '2018-05-09',
    });
  }
  return client;
};

// 审核文字内容
async function moderateText(text) {
  const c = initClient();
  if (!c || !text || typeof text !== 'string' || text.trim() === '') {
    return { pass: true };
  }

  try {
    const result = await c.request('TextScan', {
      tasks: [
        { content: Buffer.from(text.trim()).toString('base64') },
      ],
      scenes: ['antispam'],
    }, { method: 'POST' });

    const taskResult = result?.data?.[0];
    if (taskResult?.code !== 200) {
      console.warn('[审核] 文字扫描返回异常:', JSON.stringify(taskResult));
      return { pass: true };
    }

    const detail = taskResult?.results?.[0];
    if (detail?.suggestion === 'pass') {
      return { pass: true };
    }

    return {
      pass: false,
      reason: detail?.label === 'spam' ? '内容疑似垃圾信息' : '内容包含违规文字',
    };
  } catch (err) {
    console.warn('[审核] 文字扫描失败:', err.message);
    return { pass: true };
  }
}

// 审核图片内容（支持 URL 或 base64）
async function moderateImage(content) {
  const c = initClient();
  if (!c || !content) {
    return { pass: true };
  }

  try {
    const task = {};
    if (content.startsWith('http://') || content.startsWith('https://')) {
      task.url = content;
    } else {
      // base64 data URL，去掉前缀只传纯 base64
      task.content = content.replace(/^data:image\/\w+;base64,/, '');
    }

    const result = await c.request('ImageSyncScan', {
      tasks: [task],
      scenes: ['porn', 'terrorism', 'ad'],
    }, { method: 'POST' });

    const taskResult = result?.data?.[0];
    if (taskResult?.code !== 200) {
      console.warn('[审核] 图片扫描返回异常:', JSON.stringify(taskResult));
      return { pass: true };
    }

    const details = taskResult?.results || [];
    for (const d of details) {
      if (d.suggestion !== 'pass') {
        const labels = { porn: '涉黄', terrorism: '涉恐', ad: '含广告' };
        return {
          pass: false,
          reason: `图片${labels[d.scene] || '违规'}，请更换`,
        };
      }
    }

    return { pass: true };
  } catch (err) {
    console.warn('[审核] 图片扫描失败:', err.message);
    return { pass: true };
  }
}

module.exports = { moderateText, moderateImage };
