'use strict';

const APP = document.getElementById('app');

function debounse(fn, ms) {
    let isCooldown = false;

    return function(...args) {
        if (isCooldown) return;
        isCooldown = true;
        setTimeout(() => isCooldown = false, ms);
        
        fn(...args);
    }
}

function createNode(tag, className, inside, ...events) {
    const node = document.createElement(tag);

    if (className) node.className = className;

    if (inside) node.innerHTML = inside;

    for (let i = 0; i < events.length; i += 2) {
        const eventName = events[i];
        const eventFn = events[i + 1];
        node.addEventListener(eventName, eventFn);
    }
    
    return node;
}

const multiAppend = (parent, ...childs) => childs.forEach(child => parent.append(child));

(function login(){
    const loginWrap = createNode('div', 'login-wrap');
    const appTitle = createNode('h1', 'app-title', 'One-Dialog-Chat');
    const form = createNode('form', 'login');
    const title = createNode('h2', 'login-title', 'Введите имя:');    
    const input = createNode('input', 'login-input');    
    const button = createNode('button', 'login-button', 'ok', 'click', chat);
    multiAppend(form, title, input, button);
    multiAppend(loginWrap, appTitle, form);
    APP.append(loginWrap);
})();

function chat(event, name) {
    event.preventDefault();

    let usersOnline;
    let myId;

    let loginInput = document.querySelector('.login-input');
    const userName = name ? name : loginInput.value;

    if (userName === '') {
        alert('Вы не ввели свой логин');
        loginInput.value = '';
        return; 
    }

    if (userName.length > 25) {
        alert('Ваше имя не должно превышать 25 символов');
        loginInput.value = '';
        return; 
    }
    
    APP.innerHTML = '';
    const invites = createNode('div', 'invites');
    invites.insertAdjacentHTML('afterbegin', '<h1>Приглашения:</h1>');
    const usersListWrap = createNode('div', 'list-wrap');
    const anwsers = createNode('div', 'anwsers');
    anwsers.insertAdjacentHTML('afterbegin', '<h1>Ответы:</h1>');
    const haventOnline = createNode('h1', null, 'Нет пользователей онлайн');
    haventOnline.style.display = 'none';
    const localWrap = createNode('div');
    localWrap.style.display = 'none';
    localWrap.insertAdjacentHTML('afterbegin', '<h1>Пользователи онлайн:</h1>');
    const search = createNode('input', 'search', null, 'input', searchUsers);
    search.setAttribute('placeholder', 'Напишите имя пользователя, которого ищете...');
    const usersList = createNode('ul', 'users-list');

    multiAppend(localWrap, search, usersList);
    multiAppend(usersListWrap, haventOnline, localWrap);
    multiAppend(APP, invites, usersListWrap, anwsers);

    function addUser(name, id) {
        if (id === myId) return;
        const sendInvite = debounse((event) => {
            ws.send(JSON.stringify({type: 'invite', fromId: myId, toId: id, fromName: userName}));
            event.target.innerHTML = 'Отправлено!';
            setTimeout(() => event.target.innerHTML = 'Пригласить в чат', 30000);
        }, 30000); 
        const onlineUser = createNode('li', 'user');
        const localUserName = createNode('span', 'user-name', name);
        const inviteBtn = createNode('button', 'invite-btn', 'Пригласить в чат', 'click', sendInvite);
        multiAppend(onlineUser, localUserName, inviteBtn);
        usersList.append(onlineUser);
    }

    function showOnlineUsers(onlineUsers) {
        usersList.innerHTML = '';
        if (Object.keys(onlineUsers).length > 1) {
            haventOnline.style.display = 'none';
            for (let id in onlineUsers) addUser(onlineUsers[id], id);
            localWrap.style.display = 'block';
        } else {
            localWrap.style.display = 'none';
            haventOnline.style.display = 'block';
        }
    }

    function searchUsers(event) {
        if (event.target.value.trim() === '') {
            showOnlineUsers(usersOnline);
            return;
        }

        const filterList = usersOnline.filter(user => user.name.indexOf(event.target.value) !== -1);

        if (filterList) {
            document.querySelectorAll('.user').forEach(li => li.remove());
            filterList.forEach(addUser);
        }
        else return;
    }

    function showNotification(sentence, isInvite, fromId) {
        const notification = createNode('div', 'notification');
        notification.insertAdjacentHTML('afterbegin', '<h3>Новое уведомление!</h3>');
        const info = createNode('p', 'info', sentence);
    
        const hideNotification = () => notification.remove();
    
        if (isInvite) {
            const options = createNode('div', 'options');
            const sayOk = () => ws.send(JSON.stringify({typeForServer: 'collocutorId', type: 'responseToInvitation', response: 'ok', fromId: myId, toId: fromId, fromName: userName }));
            const sayNo = () => ws.send(JSON.stringify({ type: 'responseToInvitation', response: 'no', toId: fromId, fromName: userName }));
            const okButton = createNode('button', 'ok-button', 'Согласиться', 'click', sayOk, 'click', hideNotification);
            const noButton = createNode('button', 'no-button', 'Отказаться', 'click', sayNo, 'click', hideNotification);
            multiAppend(options, okButton, noButton);
            multiAppend(notification, info, options);
            invites.append(notification);
        }
        else {
            const removeButton = createNode('span', 'remove-button', '&#9746;', 'click', hideNotification);
            multiAppend(notification, removeButton, info);
            anwsers.append(notification);
        }
    }

    const ws = new WebSocket('ws://localhost/');

    ws.onopen = () => ws.send(JSON.stringify({typeForServer: 'userName', name: userName}));

    ws.onmessage = message => {
        const data = JSON.parse(message.data);
        console.log(data);
        
        switch(data.type) {
            case 'id': 
                myId = data.id;
                break;

            case 'usersList':
                usersOnline = data.users;
                showOnlineUsers(usersOnline);
                break;
            
            case 'invite':
                if (data.beginChat) {
                    dialogInterface(ws, data.name, userName);
                    break;
                }
                showNotification(`Пользователь ${data.fromName} приглашает вас в чат.`, true, data.fromId);
                break;

            case  'responseToInvitation':
                if (data.response === 'ok') {
                    dialogInterface(ws, data.fromName, userName);
                    ws.send(JSON.stringify({typeForServer: 'collocutorId', type: 'invite', beginChat: true, name: userName, toId: data.fromId}));
                } else if (data.response === 'no') showNotification(`Пользователь ${data.fromName} отклонил ваше приглашение в чат.`);
                else showNotification(`Пользователь ${data.fromName} уже находится в переписке с другим человеком.`);
                break;
        }
    }
}

function dialogInterface(ws, name, thisUserName) {
    APP.innerHTML = '';
    const nameInterlocutor = name;

    const dialogWrap = createNode('div', 'dialog-wrap');

    const leaveDialog = event => (ws.close(), chat(event, thisUserName));
    const turnBack = createNode('div', 'back', null, 'click', leaveDialog);
    turnBack.append(createNode('span', null, '&larr; Вернуться назад'));

    const messagesWrap = createNode('div', 'messages-wrap');
    const messages = createNode('div', 'messages');
    messagesWrap.append(messages);
    const nameToSend = createNode('span', 'name-interlocutor', nameInterlocutor);

    const sendMessage = (event) => {
        event.preventDefault();
        if (input.value !== '') {
            ws.send(JSON.stringify({typeForServer: 'userMessage', type: 'message', message: input.value }));
            messages.append(createNode('span', 'message', `Вы: ${input.value}`));
            input.value = '';
        }
    };

    document.addEventListener('keydown', event => event.code === 'Enter' ? sendMessage(event) : null);

    const formWrap = createNode('div', 'form-wrap');
    const form = createNode('form', 'send-form');
    const input = createNode('input', 'send-input');
    const sendButton = createNode('i', 'fas fa-paper-plane', null, 'click', sendMessage);
    multiAppend(formWrap, form, input, sendButton);

    multiAppend(dialogWrap, nameToSend, messagesWrap, formWrap);
    multiAppend(APP, turnBack, dialogWrap)

    ws.onmessage = message => {
        const data = JSON.parse(message.data);
        if (data.type === 'message') messages.append(createNode('span', 'message', `${nameInterlocutor}: ${data.message}`));
        if (data.type === 'out') {
            messages.innerHTML = '';
            messages.append(createNode('span', 'out', `Ваш собеседник ${nameInterlocutor} вышел из диалога.`));
            input.disabled = true;
        }
        if (data.type === 'invite') ws.send(JSON.stringify({ type: 'responseToInvitation', response: 'inChat', toId: data.fromId, fromName: thisUserName }));
        if (data.type === 'responseToInvitation') ws.send(JSON.stringify({ type: 'responseToInvitation', response: 'inChat', toId: data.id, fromName: thisUserName}));
    };
}