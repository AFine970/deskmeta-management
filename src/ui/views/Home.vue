<template>
  <v-container fluid class="fill-height">
    <v-row class="align-center justify-center">
      <v-col cols="12" class="text-center">
        <!-- Welcome Card -->
        <v-card class="mx-auto" max-width="800" elevation="8">
          <v-card-item>
            <v-card-title class="text-h4 text-center py-6">
              <v-icon icon="mdi-seat" size="large" class="mr-2" />
              智能换座位系统
            </v-card-title>
            <v-card-subtitle class="text-h6 text-center py-4">
              快速生成座位表 · 支持动画演示 · 方便打印导出
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="pt-4">
            <v-row>
              <v-col cols="12" sm="6" md="3">
                <v-card
                  class="mx-auto"
                  hover
                  @click="goToRoute('/layout')"
                  color="primary"
                  variant="tonal"
                >
                  <v-card-item>
                    <v-icon icon="mdi-grid" size="48" class="mb-2" />
                    <v-card-title>座位表设计</v-card-title>
                    <v-card-text>
                      创建自定义座位表布局,支持多行多列配置
                    </v-card-text>
                  </v-card-item>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-card
                  class="mx-auto"
                  hover
                  @click="goToRoute('/students')"
                  color="success"
                  variant="tonal"
                >
                  <v-card-item>
                    <v-icon icon="mdi-account-group" size="48" class="mb-2" />
                    <v-card-title>学生管理</v-card-title>
                    <v-card-text>
                      添加、编辑学生信息,支持批量导入
                    </v-card-text>
                  </v-card-item>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-card
                  class="mx-auto"
                  hover
                  @click="goToRoute('/fill')"
                  color="warning"
                  variant="tonal"
                >
                  <v-card-item>
                    <v-icon icon="mdi-dice-5" size="48" class="mb-2" />
                    <v-card-title>座位填充</v-card-title>
                    <v-card-text>
                      随机分配座位,支持同桌约束规则
                    </v-card-text>
                  </v-card-item>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-card
                  class="mx-auto"
                  hover
                  @click="goToRoute('/animation')"
                  color="info"
                  variant="tonal"
                >
                  <v-card-item>
                    <v-icon icon="mdi-play-circle" size="48" class="mb-2" />
                    <v-card-title>动画演示</v-card-title>
                    <v-card-text>
                      类似抽奖的动画效果,增强趣味性
                    </v-card-text>
                  </v-card-item>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions class="justify-center pb-6">
            <v-btn
              size="large"
              color="primary"
              @click="goToRoute('/layout')"
              prepend-icon="mdi-arrow-right"
            >
              开始使用
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToRoute(path: string) {
  router.push(path)
}
</script>

<style scoped>
.v-card {
  transition: transform 0.2s;
}

.v-card:hover {
  transform: translateY(-4px);
}
</style>
