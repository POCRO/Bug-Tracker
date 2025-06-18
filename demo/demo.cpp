#include "Test_task.h"
#include "tim.h"
#include "Remote_Control.h"
#include "Send_Data_Task.h"
#include "SEGGER_RTT.h"

uint16_t pwmVal = 2000;   // PWM占空比
uint8_t pwm_result;
uint8_t test_task_on=0;
uint8_t test_task_bsp_on = 0;

void Test_task_BSP(void)
{
    if (test_task_bsp_on == 1 && RC_ON==0)    //只有在test_task_on在watch中被手动打开，且遥控器断联状态下才进入测试模式
    {
        //涵道测试 
//        __HAL_TIM_SetCompare(&htim9, TIM_CHANNEL_1, 2000);  //涵道电机初始化，一定要放在最前面，这玩意比较欠
//        HAL_Delay(1000);
//        __HAL_TIM_SetCompare(&htim9, TIM_CHANNEL_1, 1000);
//        HAL_Delay(1000);
        
        // 逆运动学解算任务测试
        // init_matrix();          //初始化逆运动学解算用到的矩阵的内存
    }
    SEGGER_RTT_SetTerminal(0);
    SEGGER_RTT_printf(0," time | raw | slide_moving |  LPF\n");      //timestamp
}