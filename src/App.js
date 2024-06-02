import {React, useState} from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers'
import { createWeb3Modal, defaultConfig, useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react'
import {
  styleReset,
  AppBar,
  Button,
  MenuList,
  MenuListItem,
  Separator,
  Toolbar,
  Window,
  WindowHeader,
  WindowContent,
  Frame,
  TextInput,
  ScrollView
} from 'react95';
import logoIMG from './assets/images/logo.png';
import titleLogo from './assets/images/hackfs.png';
import { createGlobalStyle, ThemeProvider, styled } from 'styled-components';
import ABI from "./artifacts/contracts/MyAgent.sol/MyAgent.json";

/* Pick a theme of your choice */
import original from 'react95/dist/themes/original';

/* Original Windows95 font (optional) */
import ms_sans_serif from 'react95/dist/fonts/ms_sans_serif.woff2';
import ms_sans_serif_bold from 'react95/dist/fonts/ms_sans_serif_bold.woff2';

const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif}') format('woff2');
    font-weight: 400;
    font-style: normal
  }
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif_bold}') format('woff2');
    font-weight: bold;
    font-style: normal
  }
  body, input, select, textarea {
    font-family: 'ms_sans_serif';
  }
`;

const Wrapper = styled.div`
  padding: 5rem;
  background: ${({ theme }) => theme.desktopBackground};
  .window-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .close-icon {
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-left: -1px;
    margin-top: -1px;
    transform: rotateZ(45deg);
    position: relative;
    &:before,
    &:after {
      content: '';
      position: absolute;
      background: ${({ theme }) => theme.materialText};
    }
    &:before {
      height: 100%;
      width: 3px;
      left: 50%;
      transform: translateX(-50%);
    }
    &:after {
      height: 3px;
      width: 100%;
      left: 0px;
      top: 50%;
      transform: translateY(-50%);
    }
  }

  .window {
    width: 85%;
    height: 30rem;
  }
  .window:nth-child(2) {
    margin: 2rem;
  }
  .footer {
    display: block;
    margin: 0.25rem;
    height: 31px;
    line-height: 31px;
    padding-left: 0.25rem;
  }
`;

const projectId = 'a82e9f1096d4954b2e02839565ea6663'
const mainnet = {
  chainId: 696969,
  name: 'Galadriel Devnet',
  currency: 'GAL',
  explorerUrl: 'https://explorer.galadriel.com',
  rpcUrl: 'https://devnet.galadriel.com/'
}
const metadata = {
  name: 'My Website',
  description: 'My Website description',
  url: 'https://mywebsite.com', // origin must match your domain & subdomain
  icons: ['https://avatars.mywebsite.com/']
}

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  /*Required*/
  metadata,
})
createWeb3Modal({
  ethersConfig,
  chains: [mainnet],
  projectId
})


function MyAppBar() {
  const { open } = useWeb3Modal();
  const { address, chainId, isConnected } = useWeb3ModalAccount()
  
  return (
    <AppBar className='!top-auto bottom-0' position='absolute'>
      <Toolbar style={{ justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Button
            onClick={() => open()}
            style={{ fontWeight: 'bold' }}
          >
            <img
              src={logoIMG}
              alt='react95 logo'
              style={{ height: '20px', marginRight: 4 }}
            />
            {isConnected ? address : "Connect"}
          </Button>
        </div>
      </Toolbar>
    </AppBar>
  );
}

function getAgentRunId(receipt, contract) {
  let agentRunID
  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog(log)
      if (parsedLog && parsedLog.name === "AgentRunCreated") {
        // Second event argument
        agentRunID = ethers.toNumber(parsedLog.args[1])
      }
    } catch (error) {
      // This log might not have been from your contract, or it might be an anonymous log
      console.log("Could not parse log:", log)
    }
  }
  return agentRunID;
}

async function getNewMessages(
  contract,
  agentRunID,
  currentMessagesCount
) {
  const messages = await contract.getMessageHistoryContents(agentRunID)
  const roles = await contract.getMessageHistoryRoles(agentRunID)

  const newMessages = []
  messages.forEach((message, i) => {
    if (i >= currentMessagesCount) {
      newMessages.push({
        role: roles[i],
        content: messages[i]
      })
    }
  })
  return newMessages;
}

function MainWindow() {
  const { open } = useWeb3Modal();
  const { address, chainId, isConnected } = useWeb3ModalAccount()
  const { walletProvider } = useWeb3ModalProvider()
  const [query, setQuery] = useState({
    value: ''
  });
  const [responseContent, setContent] = useState([])
  const listItems = Array.from(responseContent).map(content => <p>{content}</p>);
  const [isBtnActive, setActive] = useState(false);
  const [btnText, setBtnText] = useState("Search");
  const handleChange = (e) => setQuery({ value: e.target.value });
  const reset = async () => {
    setActive(true);
    setBtnText("Searching...");
    await setContent([]);
    await callAgent();
  }

  async function callAgent() {
    if (!isConnected) {
      await open();
    }
    const ethersProvider = new BrowserProvider(walletProvider);
    const signer = await ethersProvider.getSigner();
    const agentContract = new Contract("0x979f1Bb83FfA981533cd466082B227e5433161E3", ABI['abi'], signer);
    const transactionResponse = await agentContract.runAgent(query.value, Number(5));
    const receipt = await transactionResponse.wait();
    console.log(`Task sent, tx hash: ${receipt.hash}`);
    console.log(`Agent started with task: "${query.value}"`);
    // Get the agent run ID from transaction receipt logs
    let agentRunID = getAgentRunId(receipt, agentContract);
    console.log(`Created agent run ID: ${agentRunID}`);
    if (!agentRunID && agentRunID !== 0) {
      return;
    }
    var exitNextLoop = false;
    while (true) {
      const newMessages = await getNewMessages(agentContract, agentRunID, responseContent.length);
      if (newMessages) {
        for (let message of newMessages) {
          let roleDisplay = message.role === 'assistant' ? 'THOUGHT' : 'STEP';
          let color = message.role === 'assistant' ? '\x1b[36m' : '\x1b[33m'; // Cyan for thought, yellow for step
          console.log(`${color}${roleDisplay}\x1b[0m: ${message.content}`);
          if (message.role === 'assistant') {
            let newContent = responseContent.concat(message.content.split(/\n/));
            setContent(newContent);
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (exitNextLoop){
        console.log(`agent run ID ${agentRunID} finished!`);
        setBtnText("Search");
        setActive(false);
        break;
      }
      if (await agentContract.isRunFinished(agentRunID)) {
        exitNextLoop = true;
      }
    }
  }

  return (
    <>
      <Window className='window' >
        <WindowHeader className='window-title' >
          <span>Explorer.exe</span>
          <Button>
            <span className='close-icon' />
          </Button>
        </WindowHeader>
        <WindowContent style={{
          padding: '0.25rem',
          height: '100%',
          }}>
          <Frame
            variant='field'
            style={{
              padding: '1rem',
              height: '91%',
              width: '100%'
            }}
          >
            <div >
              <div className='flex items-center justify-center gap-x-8'>
                <img src={titleLogo} alt='logo' className='size-20' />
                <div className='text-7xl'>
                  Filplorer
                </div>
              </div>
              <div className='flex items-center justify-center gap-x-1 mt-5'>
                <TextInput
                  value={query.value}
                  placeholder='Type here...'
                  onChange={handleChange}
                  fullWidth
                  multiline
                  className='h-12'
                />
                <Button onClick={reset} style={{ marginLeft: 4 }} disabled={isBtnActive}>
                  {btnText}
                </Button>
              </div>
              <div>
               {responseContent.length?
               <ScrollView style={{ width: '100%', height: '15rem'}}>
               {listItems}
             </ScrollView>
             :''
               }
              </div>
            </div>
          </Frame>
        </WindowContent>
        
      </Window>
    </>
  );
}


const App = () => (
  <div className='relative bg-original h-screen'>
    <GlobalStyles />
    <ThemeProvider theme={original}>
      <Wrapper>
        <MenuList>
          <MenuListItem>🎤 Sing</MenuListItem>
          <MenuListItem>💃🏻 Dance</MenuListItem>
          <Separator />
          <MenuListItem disabled>😴 Sleep</MenuListItem>
        </MenuList>
        <MainWindow />
        <MyAppBar/>
      </Wrapper>
    </ThemeProvider>
  </div>
);

export default App;