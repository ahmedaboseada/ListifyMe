export const translations = {
    en: {
        taskCompletedTitle: "Coins & Points Awarded!",
        taskCompletedBody: (title, reward) => `You completed "${title}" and earned ${reward} coins!`,
        subtaskCompletedTitle: "Coins Awarded!",
        subtaskCompletedBody: (title, reward) => `You completed subtask "${title}" and earned ${reward} coins!`,
        deadlineReminderTitle: (title) => `Deadline Reminder: ${title}`,
        deadlineReminderBody: (firstName, title) => `Hi ${firstName}, your task "${title}" is due soon! Complete it to earn coins.`,
        deadlineReminderEmailSubject: (title) => `Deadline Reminder: ${title}`,
        deadlineReminderEmailText: (firstName, title, date, reward) => `Hi ${firstName},\n\nThis is a reminder that your task "${title}" is due on ${date}.\n\nDon't forget to complete it to earn ${reward} coins!`,
        deadlineReminderEmailHtml: (firstName, title, date, reward) => `<h3>Task Reminder</h3><p>Hi ${firstName},</p><p>This is a reminder that your task <strong>"${title}"</strong> is due on <strong>${date}</strong>.</p><p>Complete it to earn <strong>${reward} coins!</strong></p>`
    },
    ar: {
        taskCompletedTitle: "تم منح النقاط والعملات!",
        taskCompletedBody: (title, reward) => `لقد أكملت "${title}" وحصلت على ${reward} عملة!`,
        subtaskCompletedTitle: "تم منح العملات!",
        subtaskCompletedBody: (title, reward) => `لقد أكملت المهمة الفرعية "${title}" وحصلت على ${reward} عملة!`,
        deadlineReminderTitle: (title) => `تذكير بموعد التسليم: ${title}`,
        deadlineReminderBody: (firstName, title) => `مرحباً ${firstName}، مهمتك "${title}" تقترب من موعد التسليم! أكملها للحصول على عملات.`,
        deadlineReminderEmailSubject: (title) => `تذكير بموعد التسليم: ${title}`,
        deadlineReminderEmailText: (firstName, title, date, reward) => `مرحباً ${firstName}،\n\nهذا تذكير بأن مهمتك "${title}" مستحقة في ${date}.\n\nلا تنسَ إكمالها لتكسب ${reward} عملة!`,
        deadlineReminderEmailHtml: (firstName, title, date, reward) => `<h3>تذكير بالمهمة</h3><p>مرحباً ${firstName}،</p><p>هذا تذكير بأن مهمتك <strong>"${title}"</strong> مستحقة في <strong>${date}</strong>.</p><p>أكملها لتكسب <strong>${reward} عملة!</strong></p>`
    }
};

export const getTranslation = (lang = 'en') => {
    return translations[lang] || translations.en;
};
