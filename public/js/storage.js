export const storage = {
    getChats() {
        try {
            return JSON.parse(localStorage.getItem('gemini_clone_chats') || '[]');
        } catch(e) {
            return [];
        }
    },
    saveChats(chats) {
        localStorage.setItem('gemini_clone_chats', JSON.stringify(chats));
    },
    getChat(id) {
        const chats = this.getChats();
        return chats.find(c => c.id === id);
    },
    saveChat(chat) {
        const chats = this.getChats();
        const index = chats.findIndex(c => c.id === chat.id);
        if (index > -1) {
            chats[index] = chat;
        } else {
            chats.unshift(chat); // 新对话排在前面
        }
        this.saveChats(chats);
    },
    deleteChat(id) {
        const chats = this.getChats();
        this.saveChats(chats.filter(c => c.id !== id));
    }
};
