import { Args, Mutation, Resolver } from '@nestjs/graphql'

import { CaptchaKindEnum, FieldKindEnum, FormStatusEnum } from '@heyform-inc/shared-types-enums'
import { nanoid } from '@heyform-inc/utils'

import { Auth, ProjectGuard, Team, User } from '@decorator'
import { CreateFormInput } from '@graphql'
import { TeamModel, UserModel } from '@model'
import { FormService } from '@service'

@Resolver()
@Auth()
export class CreateFormResolver {
  constructor(private readonly formService: FormService) {}

  /**
   * Create form
   */
  @Mutation(returns => String)
  @ProjectGuard()
  async createForm(
    @Team() team: TeamModel,
    @User() user: UserModel,
    @Args('input') input: CreateFormInput
  ): Promise<string> {
    return await this.formService.create({
      teamId: team.id,
      memberId: user.id,
      settings: {
        captchaKind: CaptchaKindEnum.NONE,
        filterSpam: false,
        active: false,
        published: true,
        allowArchive: true,
        requirePassword: false,
        locale: 'en',
        enableQuestionList: true
      },
      fields: [
        // Example field
        {
          id: nanoid(12),
          title: null,
          description: null,
          kind: FieldKindEnum.SHORT_TEXT,
          validations: { required: false }
          // No default `layout` image: comhairle embeds a fresh form on every survey step, and the
          // old hardcoded Unsplash image rendered as a broken split-image (in the builder and the
          // participant view) until an operator manually removed it. Full-width text is the default.
        },
        {
          id: nanoid(12),
          title: ['Thank you!'],
          description: ['Thanks for completing this form. Now create your own form.'],
          kind: FieldKindEnum.THANK_YOU
        }
      ],
      hiddenFields: [],
      draft: true,
      status: FormStatusEnum.NORMAL,
      ...input
    })
  }
}
