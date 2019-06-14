import React, {Component, createContext, Fragment} from 'react'
import axios from "axios"
import actioncable from "actioncable"
import {
  Route,
  Link
} from 'react-router-dom'
import styled from "styled-components"
import {ThemeProvider} from 'styled-components'
import gravatar from "gravatar"
import Moment from 'react-moment';
import ConversationEditor from '../components/conversation/Editor.js'
import Avatar from '@material-ui/core/Avatar';
import {soundManager} from 'soundmanager2'
import sanitizeHtml from 'sanitize-html';

import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'

import graphql from "../graphql/client"
import { 
    CONVERSATIONS, 
    CONVERSATION, 
    APP_USER ,
    AGENTS
  } from "../graphql/queries"
import { 
  INSERT_COMMMENT, 
  ASSIGN_USER,
  INSERT_NOTE,
  UPDATE_CONVERSATION_STATE,
  TOGGLE_CONVERSATION_PRIORITY
} from '../graphql/mutations'

import Button from '@material-ui/core/Button'
import CheckIcon from '@material-ui/icons/Check'
import InboxIcon from '@material-ui/icons/Inbox'
import PriorityHighIcon from '@material-ui/icons/PriorityHigh'
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Drawer from '@material-ui/core/Drawer';
import SendIcon from '@material-ui/icons/Send'
import {Paper,Box, Typography} from '@material-ui/core'

import UserListItem from '../components/UserListItem'
import UserData from '../components/UserData'
import { camelCase, isEmpty } from 'lodash';



import OptionMenu from '../components/conversation/optionMenu'
import FilterMenu from '../components/conversation/filterMenu'
import {last} from 'lodash'


import theme from '../components/conversation/theme'
import themeDark from '../components/conversation/darkTheme'
import EditorContainer from '../components/conversation/editorStyles'
import Progress from '../shared/Progress'

import {
  getConversations, 
  updateConversationsData
} from '../actions/conversations'


const camelizeKeys = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => camelizeKeys(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [camelCase(key)]: camelizeKeys(obj[key]),
      }),
      {},
    );
  }
  return obj;
};

const RowColumnContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ColumnContainer = styled.div`
  display: flex;
  flex: 1;
`;
const GridElement = styled.div`
  flex: 1;
  ${(props)=>{
    return props.grow ? `flex-grow: ${props.grow}` : null
  }}

  overflow: scroll;
  border-right: 1px solid #dcdcdc;
  h3 {
    margin-left: 20px;
  }
`;
const MessageContainer = styled.div`
  text-decoration: none;
  display: block;
  box-sizing: border-box;
  border-bottom: 1px solid rgba(0,0,0,.1);
  padding: 14px 20px 14px 0;
  background-color: #fff;
  border-left: 2px solid transparent;
  cursor: pointer;
  &:hover{
    background: aliceblue;
  }
`
const MessageControls = styled.div`
  display: flex;
  align-items: flex-start;
`
const MessageHeader = styled.div`
  //flex: 1 1 auto;
  //min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`
const MessageBody = styled.div`
    font-size: 14px;
    color: #bfbfbf;
    font-weight: 100;
    margin-top: 16px;
    text-indent: 10px;
    display: flex;
`
const MessageEmail = styled.div`
    color: #222;
    font-size: 14px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
`
const ActivityAvatar = styled.div`
  //display: flex;
  align-self: center;
  position: relative;
`
const Overflow = styled.div`
  overflow: auto;
  //height: 100vh;
  height: calc(100vh - 172px);
`
const ActivityIndicator = styled.span`
  position: absolute;
  height: 10px;
  width: 10px;
  background: #1be01b;
  border-radius: 10px;
  top: 6px;
  left: 64px;
`
const FixedHeader = styled.div`
  padding:20px;
  border-bottom: 1px solid #ccc;
  display: flex;
  justify-content: space-between;
`
const ChatMessageItem = styled.div`
    position: relative;
    margin: 8px 0 15px 0;
    padding: 8px 10px;
    max-width: 60%;
    display: block;
    word-wrap: break-word;
    border-radius: 3px;
    -webkit-animation: zoomIn .5s cubic-bezier(.42, 0, .58, 1);
    animation: zoomIn .5s cubic-bezier(.42, 0, .58, 1);
    clear: both;
    z-index: 999;

    &.user {
      margin-left: 60px;
      float: left;
      color: #666;  
      align-self: flex-start;   
      background: rgb(255, 255, 255);
      border: 1px solid #f7f6f6;
      p {
        color: #565555;
      }
    }

    &.admin {
      margin-right: 61px;
      float: right;
      color: ${(props)=> props.message.privateNote ? `#222` : `#eceff1` };
      background: ${(props)=> props.message.privateNote ? `#feedaf` : `#2f3335` };
      align-self: flex-end;
    }
`;

const ChatAvatar = styled.div`
    
    //background: rgba(0, 0, 0, 0.03);
    position: absolute;
    top: 0;

    &.user{
      left: -52px;
    }

    &.admin{
      right: -47px;
    }

    img {
      width: 40px;
      height: 40px;
      text-align: center;
      border-radius: 50%;
    }
`
const StatusItem = styled.span`
  font-size: 9px;
  //color: #ccc;
`
const UserDataList = styled.ul`
  li{
    span{
      margin-left:10px;
    }
  }
`

const ConversationButtons = styled.div`
  display:flex;
  align-items: center;
`

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
`

const ChatContainer = styled.div`

   display: flex;
   flex-direction: column;
   height: 100%;

  .box-container{
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    background: aliceblue;
  }

  .overflow {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 15px;
  }

  .input{
    margin: 14px;
    /* border: 1px solid #ccc; */
    border-radius: 0px;
    box-shadow: 1px 1px 2px 0px #bdbbbb;
  }

`



const playSound = ()=>{
  soundManager.createSound({
    id: 'mySound',
    url: '/sounds/pling.mp3',
    autoLoad: true,
    autoPlay: false,
    //onload: function () {
    //  alert('The sound ' + this.id + ' loaded!');
    //},
    volume: 50
  }).play()
}

class MessageItem extends Component {
  render(){
    const user = this.props.conversation.mainParticipant
    return (
      <MessageContainer>

        <MessageControls/>

        <MessageHeader>
        
          <Avatar src={gravatar.url(user.email)} width={40} heigth={40}/>
          
          <MessageEmail>
            {user.email}
          </MessageEmail>

          <Moment fromNow style={{ color: '#ccc', fontSize: '10px'}}>
            {this.props.message.created_at}
          </Moment>

        </MessageHeader>

        <MessageBody>

          {
            user.id != this.props.message.appUser.id ?
            <Avatar 
              src={gravatar.url(this.props.message.appUser.email)} 
              size={'xsmall'}
              style={{'float':'left'}}
            /> : null
          }  
              
          <span dangerouslySetInnerHTML={
            { __html: sanitizeHtml(this.props.message.message).substring(0, 250) }
          }/>
          
        </MessageBody>

      </MessageContainer>
    )
  }
}

class ConversationContainer extends Component {

  constructor(props){
    super(props)
    this.state = {
      //conversations: [],
      conversation: {},
      appUser: {},
      //meta: {},
      rightDrawer: false,

      //sort: 'newest',
      //filter: 'opened',
      //loading: false
    }
  }

  componentDidMount(){
    this.getConversations()
  }

  handleScroll = (e) => {
    let element = e.target

    //console.log(element.scrollHeight - element.scrollTop, element.clientHeight)
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      if (this.state.meta.next_page)
        this.getConversations({ append: true })
    }
  }

  getConversations = (cb)=>{

    this.props.dispatch(getConversations( ()=>{
      cb ? cb() : null
    }))

    /*this.setState({
      loading: true
    }, ()=>{

      this.props.dispatch(getConversations, ()=>{
        cb ? cb() : null
      })

      
      const nextPage = this.state.meta.next_page || 1

      graphql(CONVERSATIONS, { 
        appKey: this.props.match.params.appId, 
        page: nextPage,
        sort: this.state.sort,
        filter: this.state.filter
      }, {
        success: (data)=>{
          const conversations = data.app.conversations
          this.setState({
            conversations: nextPage > 1 ? 
            this.state.conversations.concat(conversations.collection) : 
            conversations.collection,
            meta: conversations.meta,
            loading: false
          })
          cb ? cb() : null        
        }
      })
    })*/
  }

  setSort = (option)=>{
    this.props.dispatch(updateConversationsData({sort: option}))
    this.setState({sort: option})
  }

  setFilter = (option)=>{
    this.props.dispatch(updateConversationsData({filter: option}))
  }

  showUserDrawer = (id)=>{
    this.setState({ rightDrawer: true }, ()=>{
      this.getUserData(id)
    });
  }

  getUserData = (id)=> {
    graphql(APP_USER, { appKey: this.props.app.key, id: id }, {
      success: (data) =>{
        this.setState({
          appUser: data.app.appUser
        })        
      }
    })
  }

  toggleDrawer = (side, open) => event => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }

    this.setState({rightDrawer: open });
  };

  filterButton = (handleClick)=>{
    return <Tooltip title="filter conversations">

        <Button
          aria-label="More"
          aria-controls="long-menu"
          aria-haspopup="true"
          onClick={handleClick}
        >
          {/*<MoreVertIcon />*/}
          {this.props.conversations.filter}
        </Button>

       </Tooltip>
  }

  sortButton = (handleClick)=>{
    return <Tooltip title="sort conversations">

        <Button
          aria-label="More"
          aria-controls="long-menu"
          aria-haspopup="true"
          onClick={handleClick}
        >
          {/*<MoreVertIcon />*/}
          {this.props.conversations.sort}
        </Button>

       </Tooltip>
  }

  filterConversations = (options, cb)=>{

    this.props.dispatch(
      updateConversationsData({filter: options.id}, ()=>{
        this.getConversations(cb)
      })
    )

    /*this.setState({filter: options.id}, ()=>{
      this.getConversations(cb)
    })*/
  }

  sortConversations = (options, cb)=>{

    this.props.dispatch(
      updateConversationsData({sort: options.id}, ()=>{
        this.getConversations(cb)
      })
    )

    /*
    this.setState({sort: options.id}, ()=>{
      this.getConversations(cb)
    })*/
  }

  setConversation = (conversation, cb)=>{
    this.setState({conversation: conversation}, cb)
  }


  render(){
    const {appId} = this.props.match.params

    return <RowColumnContainer>

            <Drawer 
              anchor="right" 
              open={this.state.rightDrawer} 
              onClose={this.toggleDrawer('right', false)}>
              
              {
                this.state.appUser ? 
                  <UserData width={ '300px'}
                    appUser={this.state.appUser} /> : null
              }

            </Drawer>

            <ColumnContainer>
              
              <GridElement>
                {/*<FixedHeader>Conversations</FixedHeader>*/}
                
                <FixedHeader style={{height: '82px'}}>
             
                  <HeaderTitle>
                    Conversations
                  </HeaderTitle>

                  <ConversationButtons>

                    <FilterMenu 
                      options={[
                        {id: "opened", name: "opened", count: 1, icon: <InboxIcon/> },
                        {id: "closed", name: "closed", count: 2, icon: <CheckIcon/>}
                      ]}
                      value={this.props.conversations.filter}
                      filterHandler={this.filterConversations}
                      triggerButton={this.filterButton}
                    />

                    <FilterMenu 
                      options={[
                        {id: "newest", name: "newest", count: 1, selected: true},
                        {id: "oldest", name: "oldest", count: 1},
                        {id: "waiting", name: "waiting", count: 1},
                        {id: "priority-first", name: "priority first", count: 1},
                      ]}
                      value={this.props.conversations.sort}
                      filterHandler={this.sortConversations}
                      triggerButton={this.sortButton}
                    />

                  </ConversationButtons>

                </FixedHeader>

                <Overflow onScroll={this.handleScroll}>


                  {
                    this.props.conversations.collection.map((o, i)=>{
                      const user = o.mainParticipant

                      return <div 
                                key={o.id} 
                                onClick={(e)=> this.props.history.push(`/apps/${appId}/conversations/${o.id}`) }>
                                        
                                <UserListItem
                                  value={this.state.conversation.id}
                                  mainUser={user}
                                  object={o.id}
                                  messageUser={o.lastMessage.appUser}
                                  showUserDrawer={this.showUserDrawer}
                                  messageObject={o.lastMessage}
                                  conversation={o}
                                  //createdAt={o.lastMessage.message.created_at}
                                  message={sanitizeHtml(o.lastMessage.message).substring(0, 250)}
                                />

                                {/*<MessageItem 
                                  conversation={o} 
                                  message={o.lastMessage}
                                />*/}
                              </div>
                    })
                  }

                  {this.props.conversations.loading ? 
                    <Progress/> 
                   : null }

                </Overflow>
              </GridElement>

              <Route exact path={`/apps/${appId}/conversations`}
                render={(props)=>(
                    <GridElement grow={2} style={{
                      display: 'flex', 
                      justifyContent: 'space-around'
                    }}>

                      <div style={{alignSelf: 'center'}}>
                        <Paper style={{padding: '2em'}}>
                             <Typography variant="h5" component="h3">
                                Conversations 
                              </Typography>

                              <Typography component="p">
                                Select a conversation or crate a new one
                              </Typography>

                        </Paper>
                      </div>

                      
                    </GridElement>
                )} />  
              

              <Route exact path={`/apps/${appId}/conversations/:id`} 
                  render={(props)=>(
                    <ConversationContainerShow
                      appId={appId}
                      app={this.props.app}
                      conversation={this.state.conversation}
                      setConversation={this.setConversation}
                      showUserDrawer={this.showUserDrawer}
                      currentUser={this.props.currentUser}
                      {...props}
                    />
                )} /> 

            </ColumnContainer>
          </RowColumnContainer>
  }
}

class MessageItemWrapper extends Component {
  componentDidMount(){
    // console.log(this.props.data.readAt ? "yes" : "EXEC A READ HERE!")
    // mark as read on first render
    if(!this.props.data.readAt){
      //console.log(this.props.email)
      App.conversations.perform("receive", 
        Object.assign({}, this.props.data, {email: this.props.email})
      )
    }
  }
  render(){
    return <Fragment>
            {this.props.children}
           </Fragment>
  }
}

class ConversationContainerShow extends Component {

  constructor(props){
    super(props)
    this.state = {
      messages: [],
      meta: {},
      appUser: {},
      loading: false
    }
  }

  componentDidMount(){
    this.getMessages( this.scrollToLastItem )
  }

  componentDidUpdate(PrevProps, PrevState){
    if(PrevProps.match && PrevProps.match.params.id !== this.props.match.params.id){
      this.props.setConversation({}, ()=>{

        this.setState({
          messages: [],
          meta: {}
        }, ()=> this.getMessages( this.scrollToLastItem ) )

      })

      
      //this.conversationSubscriber()
    }
  }

  handleScroll = (e) => {
    let element = e.target

    if (element.scrollTop === 0) { // on top
      if (this.state.meta.next_page)
        this.getMessages( (item)=> this.scrollToItem(item) )
    }

    // scroll bottom
    //if (element.scrollHeight - element.scrollTop === element.clientHeight) {
    //  if (this.state.meta.next_page)
    //    this.getMessages()
    //}
  }

  scrollToItem = (item)=>{
    //console.log("scrolea to ", item)
    if(item){
      this.refs.overflow.scrollTop = document.querySelector(`#message-id-${item}`).offsetHeight
    }else{
      this.scrollToLastItem()
    }
  }

  scrollToLastItem = ()=>{
    this.refs.overflow.scrollTop = this.refs.overflow.scrollHeight;
  }

  /*getMainUser = (id)=> {
    graphql(APP_USER, { appKey: this.props.appId, id: id }, {
      success: (data) =>{
        this.setState({
          appUser: data.app.appUser
        })        
      }
    })
  }*/

  getMessages = (cb)=>{
    const nextPage = this.state.meta.next_page

    this.setState({loading: true}, ()=>{
      graphql(CONVERSATION, { 
        appKey: this.props.appId, 
        id: parseInt(this.props.match.params.id), 
        page: nextPage}, {
        success: (data)=>{
          const conversation = data.app.conversation
          
            this.props.setConversation(conversation, () => {
              this.conversationSubscriber()

              const lastItem = last(this.state.messages)
      
              this.setState({
                messages: nextPage > 1 ? 
                  this.state.messages.concat(conversation.messages.collection) : 
                  conversation.messages.collection,
                meta: conversation.messages.meta,
                loading: false
              },  ()=>{
                //console.log(lastItem)
                //this.getMainUser(this.state.conversation.mainParticipant.id)
                // TODO: this will scroll scroll to last when new items are added!
                cb ? cb(lastItem ? lastItem.id : null) : null
              })
            })

        },
        error: (error)=>{
          
        }
      }) 
   })
  }

  insertComment = (comment, cb)=>{
    const id = this.props.conversation.id

    graphql(INSERT_COMMMENT, { 
      appKey: this.props.appId, 
      id: id, 
      message: comment
    }, {
        success: (data)=>{
          console.log(data)
          cb()
        },
        error: (error)=>{
          console.log(error)
        }
      })
  }

  insertNote = (comment, cb)=>{
    const id = this.props.conversation.id

    graphql(INSERT_NOTE, { 
      appKey: this.props.appId, 
      id: id, 
      message: comment
    }, {
        success: (data)=>{
          console.log(data)
          cb()
        },
        error: (error)=>{
          console.log(error)
        }
      })
  }

  unsubscribeFromConversation = ()=>{
    if (App.conversations)
      App.conversations.unsubscribe()
      App.conversations = null
  }

  conversationSubscriber(){
    this.unsubscribeFromConversation()
    App.conversations = App.cable.subscriptions.create({
      channel: "ConversationsChannel",
      app: this.props.appId,
      id: this.props.conversation.id,
      email: this.props.currentUser.email,
      inner_app: true,
    },
    {
      connected: ()=> {
        console.log("connected to conversations")
      },
      disconnected: ()=> {
        console.log("disconnected from conversations")
      },
      received: (data)=> {



        const newData = camelizeKeys(data)



        // update existing message
        if (this.state.messages.find((o) => o.id === newData.id ) ){
          const new_collection = this.state.messages.map((o)=>{
            if (o.id === newData.id ){
                return newData
              } else {
                return o
              }
          })

          //console.log('received updated', newData)
          this.setState({
            messages: new_collection
          } )

        } else {
          //console.log('received new', newData)
          //console.log(this.props.currentUser.email, newData.appUser.email)
          if (this.props.currentUser.email !== newData.appUser.email) {
            playSound()
          }

          //console.log(newData)
          
          this.setState({
            messages: [newData].concat(this.state.messages)
          }, this.scrollToLastItem)

        }
      },
      handleMessage: (message)=>{
        console.log(`handle message`)
      } 
    });    
  }

  getAgents = (cb)=>{
    graphql(AGENTS, {appKey: this.props.appId }, {
      success: (data)=>{
        cb(data.app.agents)
      }, 
      error: (error)=>{

      }
    })
  }

  setAgent = (id, cb)=>{
    graphql(ASSIGN_USER, {
      appKey: this.props.appId, 
      conversationId: this.props.conversation.id,
      appUserId: id
    }, {
      success: (data)=>{
        const conversation = data.assignUser.conversation

        this.props.setConversation(conversation, 
          ()=> cb(data.assignUser.conversation) 
        )
      },
      error: (error)=>{

      }
    })
  }

  updateConversationState = (state, cb)=>{
    graphql(UPDATE_CONVERSATION_STATE, {
      appKey: this.props.appId, 
      conversationId: this.props.conversation.id,
      state: state
    }, {
      success: (data)=>{
        const conversation = data.updateConversationState.conversation
        this.props.setConversation(conversation, 
          ()=> cb ? cb(data.updateConversationState.conversation) : null
        )
      },
      error: (error)=>{
      }
    })
  }

  toggleConversationPriority = (e, cb)=>{
    graphql(TOGGLE_CONVERSATION_PRIORITY, {
      appKey: this.props.appId, 
      conversationId: this.props.conversation.id
    }, {
      success: (data)=>{
        const conversation = data.toggleConversationPriority.conversation
        this.props.setConversation(conversation, 
          ()=> cb ? cb(data.toggleConversationPriority.conversation) : null
        )
      },
      error: (error)=>{
      }
    })
  }


  render(){
    
    return <Fragment>
          
            <GridElement grow={2}>

              {
                !isEmpty(this.props.conversation) ?
              
                <ChatContainer>
                  
                  <FixedHeader>
                    
                    <HeaderTitle>
                      Conversation with {" "}

                      {
                        this.props.conversation.mainParticipant ? 
                        <b>{this.props.conversation.mainParticipant.email}</b> 
                        : null
                      }

                    </HeaderTitle>

                    <ConversationButtons>

                      <OptionMenu 
                        getAgents={this.getAgents.bind(this)}
                        setAgent={this.setAgent.bind(this)}
                        conversation={this.props.conversation}
                      />

                      {
                        this.props.conversation.state != "closed" ?
                        <Tooltip title="Close conversation">
                          <IconButton onClick={()=>{ this.updateConversationState("close")}}>
                            <CheckIcon/>
                          </IconButton>
                        </Tooltip> : null
                      }

                      {
                        this.props.conversation.state != "opened" ?
                        <Tooltip title="Reopen conversation">
                          <IconButton onClick={()=>{ this.updateConversationState("reopen")}}>
                            <InboxIcon/>
                          </IconButton>
                        </Tooltip> : null
                      }

                      <Tooltip title={ !this.props.conversation.priority ? "Priorize conversation" : 'Remove priority'}>
                        <IconButton onClick={this.toggleConversationPriority}>
                          <PriorityHighIcon 
                            color={this.props.conversation.priority ? 'primary' : 'default' }
                          />
                        </IconButton>
                      </Tooltip>


                    </ConversationButtons>

                  </FixedHeader>

                    <div className="box-container">

                      <div className="overflow" 
                          ref="overflow" 
                          onScroll={this.handleScroll}
                          style={{
                            //boxShadow: 'inset 0px 1px 3px 0px #ccc',
                            //background: 'aliceblue',
                            flexDirection : 'column-reverse',
                            display: 'flex',
                            height: `calc(100vh - 462px)`
                          }}>

                        {
                          this.state.messages.map( (o, i)=> {

                            const userOrAdmin = this.props.conversation.mainParticipant.email === o.appUser.email ? 
                                          'user' : 'admin'
               
                            return <MessageItemWrapper 
                                      key={o.id} 
                                      data={o} 
                                      email={this.props.currentUser.email}>

                                      <ChatMessageItem 
                                        id={`message-id-${o.id}`}
                                        message={o}
                                        className={userOrAdmin}>
                                        
                                        <ChatAvatar 
                                          onClick={(e)=>this.props.showUserDrawer(o.appUser.id)}
                                          className={userOrAdmin}>
                                          <img src={gravatar.url(o.appUser.email)}/>
                                        </ChatAvatar>

                                        <ThemeProvider theme={
                                          userOrAdmin === "admin" ? 
                                          o.privateNote ? theme : themeDark 
                                          : theme 
                                        }>
                                          <EditorContainer>
                                            <div  
                                              key={i}
                                              dangerouslySetInnerHTML={{
                                                __html:  o.message 
                                              }} 
                                            />
                                          </EditorContainer>
                                       </ThemeProvider>

                                        <StatusItem>

                                          <Moment fromNow>
                                            {o.createdAt}
                                          </Moment>
                                          {" - "}
                                          {
                                            o.readAt ? 
                                              <span>
                                                {"seen "}
                                                <Moment fromNow>
                                                  {o.readAt}
                                                </Moment>
                                              </span> : 
                                                
                                              o.privateNote ? 
                                              'NOTE' : <span>not seen</span>
                                              
                                          }
                                        </StatusItem>
                                        
                                      </ChatMessageItem>

                                    </MessageItemWrapper>
                                  })
                        }

                        {this.state.loading ? <Progress/> : null }

                      </div>

                      <div className="input">
                        
                        <ConversationEditor 
                          data={{}}
                          app={this.props.app}
                          insertComment={this.insertComment}
                          insertNote={this.insertNote}
                        />

                      </div>

                    </div>

       

                </ChatContainer> : <Progress/>
             }

            </GridElement>

              {
                /*
                          <GridElement>

                            <FixedHeader>
                                User information
                            </FixedHeader>

                            <Overflow style={{ 
                              display: 'flex', 
                              flexFlow: 'column',
                              paddingTop: '20px'
                            }}>

                              <UserData 
                                width={ '100%'}
                                appUser={this.state.appUser}
                              />

                            </Overflow>

                          </GridElement>

                */
              }

          </Fragment>
  }
}

function mapStateToProps(state) {

  const { auth, app, segment, app_users, conversations, app_user } = state
  const { loading, isAuthenticated } = auth
  //const { sort, filter, collection , meta, loading} = conversations

  return {
    conversations,
    app_user,
    app,
    isAuthenticated
  }
}

export default withRouter(connect(mapStateToProps)(ConversationContainer))